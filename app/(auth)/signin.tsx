import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { AuthShell, Field, OtpInput, ResendButton, TextLink } from "../../src/components/auth";
import { Button, Text } from "../../src/components/ui";
import { sendSignInOtp, signInOtp, signInPassword } from "../../src/lib/api/auth";
import { useAuth } from "../../src/lib/auth/AuthContext";
import { getAuthErrorMessage } from "../../src/lib/auth/errors";
import { emailForm, otpForm, signInForm, validateWith } from "../../src/lib/auth/schemas";

type Mode = "password" | "code-email" | "code-otp";

interface FormValues {
  email: string;
  password: string;
  code: string;
}

export default function SignIn() {
  const params = useLocalSearchParams<{ email?: string; mode?: string }>();
  const { setSession } = useAuth();

  const [mode, setMode] = useState<Mode>(params.mode === "code" ? "code-email" : "password");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, getValues, setError, clearErrors, formState } = useForm<FormValues>({
    defaultValues: { email: params.email ?? "", password: "", code: "" },
  });
  const { errors } = formState;

  const switchMode = (next: Mode) => {
    clearErrors();
    setFormError(null);
    setMode(next);
  };

  // Run an auth action with loading + friendly error handling. On success,
  // token-returning calls go through setSession() -> authed redirect to (tabs).
  const run = async (fn: () => Promise<void>) => {
    setFormError(null);
    setSubmitting(true);
    try {
      await fn();
    } catch (e) {
      setFormError(getAuthErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const onPasswordSignIn = () => {
    clearErrors();
    const values = validateWith(signInForm, getValues(), setError);
    if (!values) return;
    void run(async () => {
      const tokens = await signInPassword(values.email, values.password);
      await setSession(tokens);
    });
  };

  const onSendCode = () => {
    clearErrors();
    const values = validateWith(emailForm, { email: getValues("email") }, setError);
    if (!values) return;
    void run(async () => {
      await sendSignInOtp(values.email);
      setMode("code-otp");
    });
  };

  const onVerifyCode = () => {
    clearErrors();
    const values = validateWith(otpForm, { code: getValues("code") }, setError);
    if (!values) return;
    void run(async () => {
      const tokens = await signInOtp(getValues("email").trim().toLowerCase(), values.code);
      await setSession(tokens);
    });
  };

  const titleByMode: Record<Mode, string> = {
    password: "Welcome back",
    "code-email": "Sign in with a code",
    "code-otp": "Enter your code",
  };
  const subtitleByMode: Record<Mode, string | undefined> = {
    password: "Sign in to continue.",
    "code-email": "We'll email you a one-time code instead of a password.",
    "code-otp": `We sent a 6-digit code to ${getValues("email")}.`,
  };

  return (
    <AuthShell
      title={titleByMode[mode]}
      subtitle={subtitleByMode[mode]}
      footer={
        mode === "password" ? (
          <>
            <TextLink label="Use a code instead" onPress={() => switchMode("code-email")} />
            <TextLink label="Forgot password?" onPress={() => router.push("/(auth)/forgot")} />
            <View className="flex-row items-center">
              <Text tone="muted">New to gada? </Text>
              <TextLink label="Create an account" onPress={() => router.push("/(auth)/signup")} />
            </View>
          </>
        ) : (
          <TextLink label="Use password instead" onPress={() => switchMode("password")} />
        )
      }
    >
      <View className="gap-4">
        {formError ? (
          <View className="rounded-md bg-coral-tint px-4 py-3">
            <Text tone="coral-ink" className="text-sm">
              {formError}
            </Text>
          </View>
        ) : null}

        {mode === "password" && (
          <>
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
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <Field
                  label="Password"
                  placeholder="Your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  onSubmitEditing={onPasswordSignIn}
                  returnKeyType="go"
                  error={errors.password?.message}
                />
              )}
            />
            <Button label="Sign in" loading={submitting} onPress={onPasswordSignIn} />
          </>
        )}

        {mode === "code-email" && (
          <>
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
                  onSubmitEditing={onSendCode}
                  returnKeyType="send"
                  error={errors.email?.message}
                />
              )}
            />
            <Button label="Send me a code" loading={submitting} onPress={onSendCode} />
          </>
        )}

        {mode === "code-otp" && (
          <>
            <Controller
              control={control}
              name="code"
              render={({ field }) => (
                <OtpInput
                  value={field.value}
                  onChangeText={field.onChange}
                  autoFocus
                  error={!!errors.code}
                  onComplete={onVerifyCode}
                />
              )}
            />
            {errors.code?.message ? (
              <Text className="text-sm text-interested">{errors.code.message}</Text>
            ) : null}
            <Button label="Verify and sign in" loading={submitting} onPress={onVerifyCode} />
            <ResendButton onResend={() => sendSignInOtp(getValues("email").trim().toLowerCase())} />
          </>
        )}
      </View>
    </AuthShell>
  );
}
