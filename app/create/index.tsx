import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryChips } from "../../src/components/app/CategoryChips";
import { DateTimeField } from "../../src/components/app/DateTimeField";
import { HostingDisabled } from "../../src/components/app/HostingDisabled";
import { TierEditor } from "../../src/components/app/TierEditor";
import { Field } from "../../src/components/auth";
import { Button, ImageUpload, Text } from "../../src/components/ui";
import { ApiError } from "../../src/lib/api/client";
import { createGadaring, createTicketTier } from "../../src/lib/api/manage";
import { deleteFile } from "../../src/lib/api/storage";
import type { Category } from "../../src/lib/api/types";
import { useAuth } from "../../src/lib/auth/AuthContext";
import { canConvene } from "../../src/lib/capabilities";
import { useDeviceLocation } from "../../src/lib/location";
import { gadaringKeys } from "../../src/lib/queries/keys";
import { manageKeys } from "../../src/lib/queries/keys";
import { tierToDto, type DraftTier } from "../../src/lib/tier-draft";
import { colors } from "../../src/theme/tokens";

const STEPS = ["Basics", "Date", "Location", "Details", "Tickets"];

export default function CreateGadaring() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useDeviceLocation();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gateBlocked, setGateBlocked] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | undefined>();
  const [isPrivate, setIsPrivate] = useState(false);
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [venue, setVenue] = useState("");
  const [capacity, setCapacity] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [bannerKey, setBannerKey] = useState<string | null>(null);
  const [tiers, setTiers] = useState<DraftTier[]>([]);

  // Replacing an as-yet-unsaved banner orphans the old upload — clean it up.
  const onBannerChange = (key: string | null) => {
    const prev = bannerKey;
    setBannerKey(key);
    if (prev && prev !== key) deleteFile(prev).catch(() => {});
  };

  if (!canConvene(user) || gateBlocked) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-page">
        <HostingDisabled onBack={() => router.replace("/(tabs)")} />
      </SafeAreaView>
    );
  }

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!title.trim()) return "Add a title.";
      if (!description.trim()) return "Add a short description.";
      if (!category) return "Choose a category.";
    }
    if (step === 1) {
      if (!start || !end) return "Set a start and end time.";
      if (end <= start) return "The end time must be after the start.";
    }
    if (step === 2) {
      if (!venue.trim()) return "Add a venue.";
    }
    if (step === 4 && tiers.length === 0) {
      return "Add at least one ticket tier.";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      void submit();
    }
  };

  const back = () => {
    setError(null);
    if (step > 0) setStep((s) => s - 1);
    else router.back();
  };

  const submit = async () => {
    if (!category || !start || !end) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const draft = await createGadaring({
        name: title.trim(),
        description: description.trim(),
        category,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        venue: venue.trim(),
        latitude: location.coords.lat,
        longitude: location.coords.lng,
        isPrivate,
        maxAttendees: capacity ? Number(capacity) : undefined,
        dressCode: dressCode.trim() || undefined,
        bannerKey: bannerKey ?? undefined,
      });

      // Create the collected tiers against the new draft (best-effort).
      const failed: string[] = [];
      for (const tier of tiers) {
        try {
          await createTicketTier(draft.id, tierToDto(tier));
        } catch {
          failed.push(tier.name || "a tier");
        }
      }

      await queryClient.invalidateQueries({ queryKey: manageKeys.all });
      await queryClient.invalidateQueries({ queryKey: gadaringKeys.all });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      if (failed.length) {
        Alert.alert(
          "Event created",
          `Your draft was created, but these tiers couldn't be added: ${failed.join(", ")}. You can add them from manage.`,
        );
      }
      router.replace({ pathname: "/manage/[id]", params: { id: draft.id } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setGateBlocked(true);
        return;
      }
      Alert.alert(
        "Couldn't create event",
        err instanceof ApiError ? err.message : "Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-page">
      {/* Header + progress */}
      <View className="gap-3 px-5 pb-2 pt-1">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} className="h-10 w-10 items-center justify-center">
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <Text weight="semibold" className="text-lg">
            Host a gadaring
          </Text>
        </View>
        <View className="flex-row gap-1.5">
          {STEPS.map((label, i) => (
            <View key={label} className="flex-1 gap-1">
              <View className={i <= step ? "h-1 rounded-pill bg-brand" : "h-1 rounded-pill bg-hairline-strong"} />
            </View>
          ))}
        </View>
        <Text tone="muted" className="text-sm">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <>
              <Field label="Title" placeholder="What's the gadaring called?" value={title} onChangeText={setTitle} />
              <Field label="Description" placeholder="Tell people what to expect" value={description} onChangeText={setDescription} multiline />
              <View className="gap-1.5">
                <Text weight="medium" className="text-sm">
                  Category
                </Text>
                <CategoryChips value={category} onChange={setCategory} />
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text weight="medium">Private event</Text>
                  <Text tone="muted" className="text-sm">
                    Only people with the link can see it.
                  </Text>
                </View>
                <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: colors.brand, false: colors.hairlineStrong }} />
              </View>
            </>
          )}

          {step === 1 && (
            <>
              <DateTimeField label="Starts" value={start} onChange={setStart} minimumDate={new Date()} />
              <DateTimeField label="Ends" value={end} onChange={setEnd} minimumDate={start ?? new Date()} />
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Venue" placeholder="e.g. Eko Hotel" value={venue} onChangeText={setVenue} />
              <View className="gap-2 rounded-md border border-hairline bg-surface p-4">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="location-outline" size={16} color={colors.muted} />
                  <Text tone="muted" className="flex-1 text-sm">
                    {location.usingFallback
                      ? `Using ${location.fallbackLabel} (location off)`
                      : "Using your current location"}
                  </Text>
                </View>
                <Text tone="faint" className="text-xs">
                  {location.coords.lat.toFixed(4)}, {location.coords.lng.toFixed(4)}
                </Text>
                <Button variant="ghost" label="Use my current location" haptic={false} onPress={location.requestAgain} />
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <ImageUpload
                variant="banner"
                purpose="banner"
                label="Banner (optional)"
                value={bannerKey}
                onChange={onBannerChange}
              />
              <Field label="Capacity (optional)" placeholder="Max attendees" keyboardType="number-pad" value={capacity} onChangeText={(t) => setCapacity(t.replace(/[^0-9]/g, ""))} />
              <Field label="Dress code (optional)" placeholder="e.g. Smart casual" value={dressCode} onChangeText={setDressCode} />
            </>
          )}

          {step === 4 && <TierEditor value={tiers} onChange={setTiers} />}

          {error ? <Text className="text-sm text-interested">{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="flex-row gap-3 border-t border-hairline px-5 pb-2 pt-3">
        <View className="flex-1">
          <Button variant="secondary" label={step === 0 ? "Cancel" : "Back"} haptic={false} onPress={back} />
        </View>
        <View className="flex-1">
          <Button
            label={step === STEPS.length - 1 ? "Create draft" : "Next"}
            loading={submitting}
            onPress={next}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
