import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { AuthShell, Field, TextLink } from "../../src/components/auth";
import { Button, Text } from "../../src/components/ui";
import { forgotPassword } from "../../src/lib/api/auth";
import { getAuthErrorMessage } from "../../src/lib/auth/errors";
import { emailForm, validateWith } from "../../src/lib/auth/schemas";

interface FormValues {
  email: string;
}

export default function Forgot() {
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, getValues, setError, clearErrors, formState } = useForm<FormValues>({
    defaultValues: { email: "" },
  });
  const { errors } = formState;

  const onSubmit = () => {
    clearErrors();
    const values = validateWith(emailForm, getValues(), setError);
    if (!values) return;
    setFormError(null);
    setSubmitting(true);
    forgotPassword(values.email)
      .then(() => {
        // Carry the email to the reset step (where the OTP is entered).
        router.push({ pathname: "/(auth)/reset", params: { email: values.email } });
      })
      .catch((e) => setFormError(getAuthErrorMessage(e)))
      .finally(() => setSubmitting(false));
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a 6-digit code."
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
          name="email"
          render={({ field }) => (
            <Field
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              textContentType="emailAddress"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onSubmitEditing={onSubmit}
              returnKeyType="send"
              error={errors.email?.message}
            />
          )}
        />
        <Button label="Send reset code" loading={submitting} onPress={onSubmit} />
      </View>
    </AuthShell>
  );
}
