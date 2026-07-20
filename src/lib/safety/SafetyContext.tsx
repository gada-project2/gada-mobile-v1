import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/ui";
import { updateIceLocation } from "../api/map-safety";
import { colors } from "../../theme/tokens";

// Push a fresh fix on this cadence while sharing is active (battery-aware).
const SHARE_INTERVAL_MS = 20_000;

interface SafetyContextValue {
  isSharing: boolean;
  /** Starts foreground live-location sharing after explicit consent. Returns true if it began. */
  startSharing: () => Promise<boolean>;
  stopSharing: () => Promise<void>;
}

const SafetyContext = createContext<SafetyContextValue | null>(null);

export function useSafety(): SafetyContextValue {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error("useSafety must be used within a SafetyProvider");
  return ctx;
}

export function SafetyProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [isSharing, setIsSharing] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushFix = useCallback(async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await updateIceLocation({
        sharingEnabled: true,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch {
      // A single failed tick shouldn't tear down sharing; the next tick retries.
    }
  }, []);

  const clearTimer = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const startSharing = useCallback(async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert(
        "Location permission needed",
        "Allow location access to share your live location with your ICE contacts.",
      );
      return false;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsSharing(true);
    await pushFix();
    clearTimer();
    timer.current = setInterval(() => void pushFix(), SHARE_INTERVAL_MS);
    return true;
  }, [pushFix]);

  const stopSharing = useCallback(async () => {
    clearTimer();
    setIsSharing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await updateIceLocation({ sharingEnabled: false });
    } catch {
      // Best-effort: even if the stop call fails, local broadcasting has ceased.
    }
  }, []);

  useEffect(() => () => clearTimer(), []);

  return (
    <SafetyContext.Provider value={{ isSharing, startSharing, stopSharing }}>
      <View style={{ flex: 1 }}>
        {children}
        {isSharing ? (
          <View
            pointerEvents="box-none"
            style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top }}
          >
            <View
              className="flex-row items-center gap-2 px-4 py-2"
              style={{ backgroundColor: colors.coral }}
              accessibilityLiveRegion="polite"
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" }} />
              <Text weight="medium" tone="surface" className="flex-1 text-sm">
                You&apos;re sharing your live location
              </Text>
              <Pressable
                onPress={() => void stopSharing()}
                accessibilityRole="button"
                accessibilityLabel="Stop sharing my location"
                hitSlop={8}
                className="rounded-pill bg-white/25 px-3 py-1"
              >
                <Text weight="semibold" tone="surface" className="text-sm">
                  Stop
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </SafetyContext.Provider>
  );
}
