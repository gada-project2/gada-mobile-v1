import { ApiError } from "../api/client";

// Map API error codes / HTTP status to friendly, sentence-case copy.
// Codes are matched first (more specific); status is a fallback for unknowns.
const COPY_BY_CODE: Record<string, string> = {
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  TOO_MANY_REQUESTS: "Too many attempts. Please wait a moment and try again.",

  INVALID_OTP: "That code isn't right. Check it and try again.",
  OTP_INVALID: "That code isn't right. Check it and try again.",
  INVALID_CODE: "That code isn't right. Check it and try again.",
  OTP_EXPIRED: "That code has expired. Request a new one.",
  EXPIRED_OTP: "That code has expired. Request a new one.",

  INVALID_CREDENTIALS: "Email or password is incorrect.",
  UNAUTHORIZED: "Email or password is incorrect.",

  USER_ALREADY_EXISTS: "An account with this email already exists. Try signing in.",
  EMAIL_ALREADY_EXISTS: "An account with this email already exists. Try signing in.",
  ACCOUNT_EXISTS: "An account with this email already exists. Try signing in.",
  CONFLICT: "An account with this email already exists. Try signing in.",

  USER_NOT_FOUND: "We couldn't find an account for that email.",
  ACCOUNT_NOT_VERIFIED: "Your email isn't verified yet. Check your inbox for a code.",
};

const COPY_BY_STATUS: Record<number, string> = {
  429: "Too many attempts. Please wait a moment and try again.",
  401: "Email or password is incorrect.",
  403: "You don't have permission to do that.",
  409: "An account with this email already exists. Try signing in.",
  500: "Something went wrong on our end. Please try again shortly.",
  502: "We're having trouble reaching the server. Please try again.",
  503: "We're having trouble reaching the server. Please try again.",
};

/** Turn any thrown auth error into a friendly, user-facing message. */
export function getAuthErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const byCode = err.code && COPY_BY_CODE[err.code.toUpperCase()];
    if (byCode) return byCode;

    const byStatus = COPY_BY_STATUS[err.status];
    if (byStatus) return byStatus;

    // 400s with a server-supplied message are usually safe + useful to show.
    if (err.message) return err.message;
    return "Something went wrong. Please try again.";
  }

  // Network failure, timeout, or anything non-API.
  return "Network error. Check your connection and try again.";
}
