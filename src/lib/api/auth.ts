import { apiFetch } from "./client";
import type { Tokens } from "./types";

// Auth API surface. Endpoints + DTOs confirmed against /v1/auth in docs-json.
// All calls skip auth (no access token yet) and skip the 401 refresh-retry — a
// 401 here means bad credentials / OTP, not an expired access token.
function authPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body, skipAuth: true, skipAuthRefresh: true });
}

/** OTP purposes accepted by the production /auth/verify-otp contract. */
export type OtpPurpose = "SIGNUP" | "SIGNIN" | "RESET_PASSWORD";

/** Step 1 of signup: register the email and trigger an OTP email. */
export function signUp(email: string): Promise<void> {
  return authPost<void>("/auth/signup", { email });
}

/** Re-send the signup OTP to the email. */
export function resendOtp(email: string): Promise<void> {
  return authPost<void>("/auth/send-otp", { email });
}

/** Step 2 of signup: verify the 6-digit code for the email + purpose. */
export function verifyOtp(email: string, code: string, purpose: OtpPurpose): Promise<void> {
  return authPost<void>("/auth/verify-otp", { email, code, purpose });
}

/**
 * Step 3 of signup: set the display name + password and obtain tokens.
 * Production CompleteSignupDto is { email, displayName, password } — no role,
 * no confirmPassword (the UI validates the password match client-side).
 * Returns Tokens for the caller to hand to AuthContext.setSession().
 */
export function completeSignup(
  email: string,
  displayName: string,
  password: string,
): Promise<Tokens> {
  return authPost<Tokens>("/auth/complete-signup", { email, displayName, password });
}

/** Password sign-in. Returns Tokens. */
export function signInPassword(email: string, password: string): Promise<Tokens> {
  return authPost<Tokens>("/auth/signin", { email, password });
}

/** Passwordless sign-in, step 1: email a one-time code. */
export function sendSignInOtp(email: string): Promise<void> {
  return authPost<void>("/auth/send-signin-otp", { email });
}

/** Passwordless sign-in, step 2: exchange the code for tokens (no purpose needed). */
export function signInOtp(email: string, code: string): Promise<Tokens> {
  return authPost<Tokens>("/auth/signin-otp", { email, code });
}

/** Request a password-reset OTP. */
export function forgotPassword(email: string): Promise<void> {
  return authPost<void>("/auth/forgot-password", { email });
}

/** Complete a password reset. Production contract: { email, code, newPassword }
 * (no confirmPassword — the UI validates the match client-side). */
export function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  return authPost<void>("/auth/reset-password", { email, code, newPassword });
}

/**
 * Low-level logout (revokes the refresh token server-side). Prefer
 * AuthContext.signOut(), which already revokes via clearSession({ revoke: true })
 * and drives the redirect back to (auth).
 */
export function logout(refreshToken: string): Promise<void> {
  return authPost<void>("/auth/logout", { refreshToken });
}
