import * as SecureStore from "expo-secure-store";

import { apiFetch } from "../api/client";
import type { CurrentUser, Tokens } from "../api/types";

// Security model (differs from web — see CLAUDE.md):
//   • Refresh token  -> expo-secure-store (iOS Keychain / Android Keystore).
//   • Access token   -> in-memory only (this module-level variable). NEVER persisted.
//   • NEVER AsyncStorage. NEVER log a token.

const REFRESH_TOKEN_KEY = "gada.refreshToken";

let accessToken: string | null = null;

// Single-flight guard: concurrent 401s share one in-flight refresh.
let refreshInFlight: Promise<string | null> | null = null;

/** The in-memory access token, or null. Read by the API client per request. */
export function getAccessToken(): string | null {
  return accessToken;
}

/** Persist a freshly-issued token pair: refresh -> secure store, access -> memory. */
export async function setSession(tokens: Tokens): Promise<void> {
  accessToken = tokens.accessToken;
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

/**
 * Wipe the session. Optionally revoke the refresh token server-side first.
 * Always clears memory + secure store, even if revocation fails.
 */
export async function clearSession(opts: { revoke?: boolean } = {}): Promise<void> {
  if (opts.revoke) {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: { refreshToken },
          skipAuth: true,
          skipAuthRefresh: true,
        });
      }
    } catch {
      // Best-effort revoke; local clear below is what actually ends the session.
    }
  }

  accessToken = null;
  refreshInFlight = null;
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // ignore — nothing more we can do
  }
}

/**
 * Rotate the session using the stored refresh token. Single-flight: simultaneous
 * callers receive the same in-flight promise. On any failure the session is
 * cleared and `null` is returned.
 */
export function refreshSession(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        await clearSession();
        return null;
      }

      const tokens = await apiFetch<Tokens>("/auth/refresh", {
        method: "POST",
        body: { refreshToken },
        skipAuth: true,
        skipAuthRefresh: true,
      });

      await setSession(tokens);
      return accessToken;
    } catch {
      await clearSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Current user from the in-memory access token, or null if unauthenticated. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    // Production /auth/me nests the user under data.user, with a redundant
    // `capabilities` wrapper (same flat booleans + requiresVerification). We
    // return the flat user and fold in requiresVerification.
    const res = await apiFetch<{
      user: CurrentUser;
      capabilities?: { requiresVerification?: boolean };
    }>("/auth/me");
    return { ...res.user, requiresVerification: res.capabilities?.requiresVerification };
  } catch {
    return null;
  }
}

/**
 * Cold-start bootstrap: read the stored refresh token, rotate to obtain an
 * access token, then hydrate the current user. Returns null when there is no
 * valid session (first launch, logged out, or expired refresh token).
 */
export async function bootstrapSession(): Promise<CurrentUser | null> {
  const token = await refreshSession();
  if (!token) return null;
  return getCurrentUser();
}
