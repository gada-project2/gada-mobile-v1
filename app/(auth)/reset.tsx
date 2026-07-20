import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { AuthShell, Field, OtpInput, ResendButton, TextLink } from "../../src/components/auth";
import { Button, Text } from "../../src/components/ui";
import { forgotPassword, resetPassword } from "../../src/lib/api/auth";
import { getAuthErrorMessage } from "../../src/lib/auth/errors";
import { resetForm, validateWith } from "../../src/lib/auth/schemas";

interface FormValues {
  code: string;
  password: string;
  confirmPassword: string;
}

export default function Reset() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email ?? "").trim().toLowerCase();

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { control, getValues, setError, clearErrors, formState } = useForm<FormValues>({
    defaultValues: { code: "", password: "", confirmPassword: "" },
  });
  const { errors } = formState;

  const onSubmit = () => {
    clearErrors();
    const values = validateWith(resetForm, getValues(), setError);
    if (!values) return;
    setFormError(null);
    setSubmitting(true);
    resetPassword(email, values.code, values.password)
      .then(() => setDone(true))
      .catch((e) => setFormError(getAuthErrorMessage(e)))
      .finally(() => setSubmitting(false));
  };

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You can now sign in with your new password.">
        <Button
          label="Back to sign in"
          onPress={() => router.replace({ pathname: "/(auth)/signin", params: { email } })}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Enter your code"
      subtitle={email ? `Enter the code we sent to ${email} and choose a new password.` : undefined}
      footer={<TextLink label="Back to sign in" onPress={() => router.replace("/(auth)/signin")} />}
    >
      <View className="gap-4">
        {formError ? (
          <View className="rounded-md bg-coral-tint px-4 py-3">
            <Text tone="coral-ink" className="text-sm">
              {formError}
            </Text>
          </View>
        ) : null}

        <Controller
          control={control}
          name="code"
          render={({ field }) => (
            <OtpInput
              value={field.value}
              onChangeText={field.onChange}
              autoFocus
              error={!!errors.code}
            />
          )}
        />
        {errors.code?.message ? (
          <Text className="text-sm text-interested">{errors.code.message}</Text>
        ) : null}

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Field
              label="New password"
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.password?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field }) => (
            <Field
              label="Confirm new password"
              placeholder="Re-enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <Button label="Reset password" loading={submitting} onPress={onSubmit} />
        <ResendButton onResend={() => forgotPassword(email)} />
      </View>
    </AuthShell>
  );
}
