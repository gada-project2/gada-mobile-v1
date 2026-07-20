import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { AuthShell, Field, OtpInput, ResendButton, TextLink } from "../../src/components/auth";
import { Button, Text } from "../../src/components/ui";
import {
  completeSignup,
  resendOtp,
  signUp,
  verifyOtp,
} from "../../src/lib/api/auth";
import { useAuth } from "../../src/lib/auth/AuthContext";
import { getAuthErrorMessage } from "../../src/lib/auth/errors";
import {
  emailForm,
  otpForm,
  setPasswordForm,
  validateWith,
} from "../../src/lib/auth/schemas";

type Step = "email" | "otp" | "password";

interface FormValues {
  email: string;
  code: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}

export default function SignUp() {
  const { setSession } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, getValues, setError, clearErrors, formState } = useForm<FormValues>({
    defaultValues: { email: "", code: "", displayName: "", password: "", confirmPassword: "" },
  });
  const { errors } = formState;

  const email = () => getValues("email").trim().toLowerCase();

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

  const onSubmitEmail = () => {
    clearErrors();
    const values = validateWith(emailForm, { email: getValues("email") }, setError);
    if (!values) return;
    void run(async () => {
      await signUp(values.email);
      setStep("otp");
    });
  };

  const onVerifyOtp = () => {
    clearErrors();
    const values = validateWith(otpForm, { code: getValues("code") }, setError);
    if (!values) return;
    void run(async () => {
      await verifyOtp(email(), values.code, "SIGNUP");
      setStep("password");
    });
  };

  const onCompleteSignup = () => {
    clearErrors();
    const values = validateWith(
      setPasswordForm,
      {
        displayName: getValues("displayName"),
        password: getValues("password"),
        confirmPassword: getValues("confirmPassword"),
      },
      setError,
    );
    if (!values) return;
    void run(async () => {
      const tokens = await completeSignup(email(), values.displayName, values.password);
      await setSession(tokens); // -> authed redirect to (tabs)
    });
  };

  // "Skip password": account is verified; finish later by signing in passwordless.
  const skipToPasswordless = () => {
    router.replace({ pathname: "/(auth)/signin", params: { email: email(), mode: "code" } });
  };

  const titleByStep: Record<Step, string> = {
    email: "Create your account",
    otp: "Verify your email",
    password: "Set up your profile",
  };
  const subtitleByStep: Record<Step, string | undefined> = {
    email: "Discover and attend gadarings near you.",
    otp: `Enter the 6-digit code we sent to ${getValues("email")}.`,
    password: "Add your name and a password to finish.",
  };

  return (
    <AuthShell
      title={titleByStep[step]}
      subtitle={subtitleByStep[step]}
      footer={
        step === "email" ? (
          <View className="flex-row items-center">
            <Text tone="muted">Already have an account? </Text>
            <TextLink label="Sign in" onPress={() => router.push("/(auth)/signin")} />
          </View>
        ) : step === "otp" ? (
          <>
            <ResendButton onResend={() => resendOtp(email())} />
            <TextLink
              label="Use a different email"
              onPress={() => {
                clearErrors();
                setFormError(null);
                setStep("email");
              }}
            />
          </>
        ) : (
          <TextLink label="Skip for now — sign in with a code" onPress={skipToPasswordless} />
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

        {step === "email" && (
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
                  onSubmitEditing={onSubmitEmail}
                  returnKeyType="next"
                  error={errors.email?.message}
                />
              )}
            />
            <Button label="Continue" loading={submitting} onPress={onSubmitEmail} />
          </>
        )}

        {step === "otp" && (
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
                  onComplete={onVerifyOtp}
                />
              )}
            />
            {errors.code?.message ? (
              <Text className="text-sm text-interested">{errors.code.message}</Text>
            ) : null}
            <Button label="Verify email" loading={submitting} onPress={onVerifyOtp} />
          </>
        )}

        {step === "password" && (
          <>
            <Controller
              control={control}
              name="displayName"
              render={({ field }) => (
                <Field
                  label="Your name"
                  placeholder="e.g. Aisha Bello"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.displayName?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <Field
                  label="Password"
                  placeholder="At least 8 characters"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.password?.message}
                  hint="Use at least 8 characters."
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field }) => (
                <Field
                  label="Confirm password"
                  placeholder="Re-enter your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  onSubmitEditing={onCompleteSignup}
                  returnKeyType="go"
                  error={errors.confirmPassword?.message}
                />
              )}
            />
            <Button label="Create account" loading={submitting} onPress={onCompleteSignup} />
          </>
        )}
      </View>
    </AuthShell>
  );
}
