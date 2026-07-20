import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { z } from "zod";

// Shared field rules.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code.");

// --- Form schemas -----------------------------------------------------------

export const emailForm = z.object({ email: emailSchema });
export type EmailForm = z.infer<typeof emailForm>;

export const signInForm = z.object({
  email: emailSchema,
  // Don't enforce length on sign-in — existing passwords predate the rule.
  password: z.string().min(1, "Enter your password."),
});
export type SignInForm = z.infer<typeof signInForm>;

export const otpForm = z.object({ code: otpSchema });
export type OtpForm = z.infer<typeof otpForm>;

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your name.");

// Convener (host) verification: 11-digit NIN + a date of birth that is 18+.
export const ninSchema = z
  .string()
  .trim()
  .regex(/^\d{11}$/, "Enter your 11-digit NIN.");

export const convenerVerifyForm = z.object({
  nin: ninSchema,
  // dateOfBirth is an ISO string; must be a valid past date and 18+ years ago.
  dateOfBirth: z.string().refine((iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    return d <= cutoff;
  }, "You must be at least 18 to host."),
});
export type ConvenerVerifyForm = z.infer<typeof convenerVerifyForm>;

const passwordsMatch = {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
};

export const setPasswordForm = z
  .object({
    displayName: displayNameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, passwordsMatch);
export type SetPasswordForm = z.infer<typeof setPasswordForm>;

export const resetForm = z
  .object({
    code: otpSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, passwordsMatch);
export type ResetForm = z.infer<typeof resetForm>;

/**
 * Validate `values` against a zod schema and, on failure, push messages into
 * react-hook-form's field errors. Returns the parsed data or null. Lets a
 * single screen validate different shapes per step without swapping resolvers.
 */
export function validateWith<TForm extends FieldValues, TOut>(
  schema: z.ZodType<TOut>,
  values: unknown,
  setError: UseFormSetError<TForm>,
): TOut | null {
  const result = schema.safeParse(values);
  if (result.success) return result.data;

  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string") {
      setError(field as Path<TForm>, { type: "validate", message: issue.message });
    }
  }
  return null;
}
