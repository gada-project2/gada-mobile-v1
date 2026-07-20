import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { verifyConvener } from "../../lib/api/account";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../../lib/auth/AuthContext";
import { convenerVerifyForm } from "../../lib/auth/schemas";
import { colors } from "../../theme/tokens";
import { Field } from "../auth";
import { Button, Text } from "../ui";
import { DateTimeField } from "./DateTimeField";

/**
 * The "Become a convener" gate. Shown wherever the app requires hosting
 * (`canConvene`) but the account isn't verified yet — instead of a dead end, it
 * runs the just-in-time NIN + DOB check (POST /users/me/convener/verify). On
 * success it refetches the user, which flips `canConvene` and lets the parent
 * gate re-render into the real screen (e.g. the create form) the user wanted.
 */
export function HostingDisabled({ onBack }: { onBack?: () => void }) {
  const { refreshUser } = useAuth();
  const [nin, setNin] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [errors, setErrors] = useState<{ nin?: string; dateOfBirth?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setFormError(null);
    const parsed = convenerVerifyForm.safeParse({
      nin,
      dateOfBirth: dob ? dob.toISOString() : "",
    });
    if (!parsed.success) {
      const next: { nin?: string; dateOfBirth?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "nin" || key === "dateOfBirth") next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await verifyConvener(parsed.data.nin, parsed.data.dateOfBirth);
      // canConvene is now true — refetch so the gating parent re-renders.
      await refreshUser();
    } catch (e) {
      if (e instanceof ApiError && e.code === "NIN_ALREADY_REGISTERED") {
        setFormError("This NIN is already registered to another account.");
      } else if (e instanceof ApiError && e.message) {
        setFormError(e.message); // 400 validation — show the server's message
      } else {
        setFormError("Couldn't verify right now. Please check your connection and try again.");
      }
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="items-center gap-2 pt-4">
        <Ionicons name="shield-checkmark-outline" size={44} color={colors.brand} />
        <Text weight="semibold" className="text-center text-xl">
          Become a convener
        </Text>
        <Text tone="muted" className="text-center">
          Hosting gadarings needs a one-time identity check. Enter your NIN and
          date of birth to unlock hosting.
        </Text>
      </View>

      {formError ? (
        <View className="rounded-md bg-coral-tint px-4 py-3">
          <Text tone="coral-ink" className="text-sm">
            {formError}
          </Text>
        </View>
      ) : null}

      <Field
        label="National Identification Number (NIN)"
        placeholder="11-digit NIN"
        keyboardType="number-pad"
        maxLength={11}
        value={nin}
        onChangeText={(t) => setNin(t.replace(/[^0-9]/g, ""))}
        error={errors.nin}
      />

      <View className="gap-1.5">
        <DateTimeField
          label="Date of birth"
          mode="date"
          value={dob}
          maximumDate={new Date()}
          onChange={setDob}
        />
        {errors.dateOfBirth ? (
          <Text className="text-sm text-interested">{errors.dateOfBirth}</Text>
        ) : null}
      </View>

      <View className="gap-3 pt-2">
        <Button label="Verify and continue" loading={submitting} onPress={submit} />
        <Button
          variant="secondary"
          label="Not now"
          haptic={false}
          onPress={() => (onBack ? onBack() : router.back())}
        />
      </View>

      <Text tone="faint" className="text-center text-xs">
        Your NIN is used only to verify your identity for hosting.
      </Text>
    </ScrollView>
  );
}
