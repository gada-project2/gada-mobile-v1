import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import { useKeepAwakeSafe } from "../../../src/lib/keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";

import { HostingDisabled } from "../../../src/components/app/HostingDisabled";
import { Button, Text } from "../../../src/components/ui";
import {
  checkInByPurchaseId,
  checkInByQr,
  type CheckInResult,
  type CheckInStatus,
} from "../../../src/lib/api/checkin";
import { useAuth } from "../../../src/lib/auth/AuthContext";
import { canConvene } from "../../../src/lib/capabilities";
import { gadaringKeys } from "../../../src/lib/queries/keys";
import { useGadaring } from "../../../src/lib/queries/gadarings";
import { colors } from "../../../src/theme/tokens";

const SAME_TOKEN_DEBOUNCE_MS = 4000;
const RESULT_VISIBLE_MS = 2500;

const STATUS_STYLE: Record<
  CheckInStatus,
  { bg: string; icon: keyof typeof Ionicons.glyphMap; title: string }
> = {
  checked_in: { bg: "#0E9F6E", icon: "checkmark-circle", title: "Checked in" },
  already: { bg: "#EF9F27", icon: "alert-circle", title: "Already checked in" },
  wrong_event: { bg: "#E24B4A", icon: "close-circle", title: "Wrong event" },
  invalid: { bg: "#E24B4A", icon: "close-circle", title: "Invalid ticket" },
  error: { bg: "#5B636B", icon: "warning", title: "Try again" },
};

interface RecentEntry {
  key: string;
  status: CheckInStatus;
  name: string;
  tier?: string;
}

export default function CheckInScanner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  useKeepAwakeSafe();

  const [permission, requestPermission] = useCameraPermissions();
  const detail = useGadaring(id);

  const [result, setResult] = useState<CheckInResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [torch, setTorch] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [tally, setTally] = useState({ scanned: 0, checkedIn: 0, duplicates: 0 });
  const [recent, setRecent] = useState<RecentEntry[]>([]);

  const lastScan = useRef<{ token: string; at: number }>({ token: "", at: 0 });
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  // Ask once on mount if undetermined.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const haptic = (status: CheckInStatus) => {
    if (status === "checked_in") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (status === "already") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  const applyResult = useCallback(
    (res: CheckInResult) => {
      setTally((t) => ({
        scanned: t.scanned + 1,
        checkedIn: t.checkedIn + (res.status === "checked_in" ? 1 : 0),
        duplicates: t.duplicates + (res.status === "already" ? 1 : 0),
      }));
      counter.current += 1;
      setRecent((r) =>
        [
          {
            key: `${counter.current}`,
            status: res.status,
            name: res.attendee?.name ?? res.message,
            tier: res.attendee?.tier,
          },
          ...r,
        ].slice(0, 6),
      );
      haptic(res.status);
      if (res.status === "checked_in") {
        void queryClient.invalidateQueries({ queryKey: gadaringKeys.tickets(id) });
        void queryClient.invalidateQueries({ queryKey: gadaringKeys.detail(id) });
      }
      setResult(res);
      resetTimer.current = setTimeout(() => {
        setResult(null);
        setProcessing(false);
      }, RESULT_VISIBLE_MS);
    },
    [id, queryClient],
  );

  const run = useCallback(
    async (fn: () => Promise<CheckInResult>) => {
      setProcessing(true);
      const res = await fn();
      applyResult(res);
    },
    [applyResult],
  );

  const handleBarcode = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (paused || processing || !data) return;
      const now = Date.now();
      if (lastScan.current.token === data && now - lastScan.current.at < SAME_TOKEN_DEBOUNCE_MS) {
        return;
      }
      lastScan.current = { token: data, at: now };
      void run(() => checkInByQr(id, data));
    },
    [paused, processing, id, run],
  );

  const submitManual = () => {
    const value = manualValue.trim();
    if (!value) return;
    setManualOpen(false);
    setManualValue("");
    void run(() => checkInByPurchaseId(id, value));
  };

  // --- Capability gate ---
  if (!canConvene(user)) {
    return (
      <View className="flex-1 bg-page" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <HostingDisabled onBack={() => router.back()} />
      </View>
    );
  }

  const scanningActive = !paused && !processing;
  const cameraReady = permission?.granted;

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      {cameraReady ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={facing === "back" && torch}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanningActive ? handleBarcode : undefined}
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-3 bg-page px-8" style={{ paddingTop: insets.top }}>
          <Ionicons name="camera-outline" size={44} color={colors.faint} />
          <Text weight="semibold" className="text-center text-xl">
            Camera access needed
          </Text>
          <Text tone="muted" className="text-center">
            Allow camera access to scan ticket QR codes. You can still check people in by entering a
            purchase id below.
          </Text>
          {permission && !permission.granted && permission.canAskAgain ? (
            <Button label="Allow camera" onPress={() => requestPermission()} />
          ) : null}
          <Button variant="secondary" label="Enter purchase id" onPress={() => setManualOpen(true)} />
          <Button variant="ghost" label="Go back" haptic={false} onPress={() => router.back()} />
        </View>
      )}

      {/* Reticle */}
      {cameraReady && !result ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} className="items-center justify-center">
          <View
            className="rounded-lg border-2"
            style={{ width: 240, height: 240, borderColor: paused ? colors.faint : "#FFFFFF" }}
          />
        </View>
      ) : null}

      {/* Top bar */}
      <View style={{ paddingTop: insets.top + 8 }} className="absolute left-0 right-0 top-0 gap-3 px-4 pb-3">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} className="h-10 w-10 items-center justify-center rounded-pill bg-black/40">
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View className="flex-1">
            <Text weight="semibold" tone="surface" numberOfLines={1}>
              Check in
            </Text>
            <Text tone="surface" className="text-xs opacity-80" numberOfLines={1}>
              {detail.data?.name ?? "Scan ticket QR codes"}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="rounded-pill bg-black/40 px-3 py-1">
            <Text tone="surface" className="text-xs">
              Scanned {tally.scanned}
            </Text>
          </View>
          <View className="rounded-pill bg-brand px-3 py-1">
            <Text tone="surface" className="text-xs">
              In {tally.checkedIn}
            </Text>
          </View>
          <View className="rounded-pill bg-black/40 px-3 py-1">
            <Text tone="surface" className="text-xs">
              Dup {tally.duplicates}
            </Text>
          </View>
        </View>

        {recent.length > 0 ? (
          <View className="gap-1">
            {recent.slice(0, 3).map((r) => (
              <View key={r.key} className="flex-row items-center gap-1.5">
                <View className="h-2 w-2 rounded-pill" style={{ backgroundColor: STATUS_STYLE[r.status].bg }} />
                <Text tone="surface" className="flex-1 text-xs opacity-90" numberOfLines={1}>
                  {r.name}
                  {r.tier ? ` · ${r.tier}` : ""}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Bottom controls */}
      {cameraReady ? (
        <View style={{ paddingBottom: insets.bottom + 16 }} className="absolute bottom-0 left-0 right-0 flex-row items-center justify-around px-6 pt-4">
          <ControlButton
            icon={paused ? "play" : "pause"}
            label={paused ? "Resume" : "Pause"}
            onPress={() => setPaused((p) => !p)}
          />
          <ControlButton icon="camera-reverse-outline" label="Flip" onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))} />
          <ControlButton
            icon={torch ? "flash" : "flash-outline"}
            label="Torch"
            active={torch}
            disabled={facing !== "back"}
            onPress={() => setTorch((t) => !t)}
          />
          <ControlButton icon="keypad-outline" label="Manual" onPress={() => setManualOpen(true)} />
        </View>
      ) : null}

      {/* Result overlay (solid colour — no flashing; respects reduced motion) */}
      {result ? (
        <Pressable
          onPress={() => {
            if (resetTimer.current) clearTimeout(resetTimer.current);
            setResult(null);
            setProcessing(false);
          }}
          style={[StyleSheet.absoluteFill, { backgroundColor: STATUS_STYLE[result.status].bg }]}
          className="items-center justify-center gap-3 px-10"
          accessibilityLiveRegion={reducedMotion ? "polite" : "assertive"}
        >
          <Ionicons name={STATUS_STYLE[result.status].icon} size={88} color="#FFFFFF" />
          <Text weight="semibold" tone="surface" className="text-center text-3xl">
            {STATUS_STYLE[result.status].title}
          </Text>
          {result.attendee ? (
            <Text tone="surface" className="text-center text-xl">
              {result.attendee.name} · {result.attendee.tier}
            </Text>
          ) : (
            <Text tone="surface" className="text-center text-lg opacity-90">
              {result.message}
            </Text>
          )}
          <Text tone="surface" className="text-center text-sm opacity-80">
            Tap to scan the next ticket
          </Text>
        </Pressable>
      ) : null}

      {/* Manual entry */}
      <Modal transparent visible={manualOpen} animationType="fade" onRequestClose={() => setManualOpen(false)}>
        <View className="flex-1 justify-center bg-black/60 px-6">
          <View className="gap-4 rounded-lg bg-surface p-5">
            <Text weight="semibold" className="text-lg">
              Enter purchase id
            </Text>
            <TextInput
              value={manualValue}
              onChangeText={setManualValue}
              placeholder="Purchase id"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              className="min-h-[48px] rounded-md border border-hairline-strong bg-surface px-4 font-sans text-base text-ink"
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button variant="secondary" label="Cancel" haptic={false} onPress={() => setManualOpen(false)} />
              </View>
              <View className="flex-1">
                <Button label="Check in" onPress={submitManual} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
  active,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!active }}
      className="items-center gap-1"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-pill"
        style={{ backgroundColor: active ? "#FFFFFF" : "rgba(0,0,0,0.45)" }}
      >
        <Ionicons name={icon} size={22} color={active ? colors.ink : "#FFFFFF"} />
      </View>
      <Text tone="surface" className="text-xs">
        {label}
      </Text>
    </Pressable>
  );
}
