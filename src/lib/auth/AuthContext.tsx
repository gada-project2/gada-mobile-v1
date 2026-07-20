import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { CurrentUser, Tokens } from "../api/types";
import {
  bootstrapSession,
  clearSession,
  getCurrentUser,
  setSession as persistSession,
} from "./session";

export type AuthStatus = "loading" | "authed" | "guest";

interface AuthContextValue {
  user: CurrentUser | null;
  status: AuthStatus;
  /** Persist a freshly-issued token pair and hydrate the user (e.g. after sign-in). */
  setSession: (tokens: Tokens) => Promise<void>;
  /** Revoke + clear the session and return to guest. */
  signOut: () => Promise<void>;
  /** Re-fetch the current user (e.g. after profile / capability changes). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  // Cold start: hydrate from the stored refresh token.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hydrated = await bootstrapSession();
      if (cancelled) return;
      setUser(hydrated);
      setStatus(hydrated ? "authed" : "guest");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback(async (tokens: Tokens) => {
    await persistSession(tokens);
    const hydrated = await getCurrentUser();
    setUser(hydrated);
    setStatus(hydrated ? "authed" : "guest");
  }, []);

  const signOut = useCallback(async () => {
    await clearSession({ revoke: true });
    setUser(null);
    setStatus("guest");
  }, []);

  const refreshUser = useCallback(async () => {
    const hydrated = await getCurrentUser();
    setUser(hydrated);
    if (!hydrated) setStatus("guest");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, setSession, signOut, refreshUser }),
    [user, status, setSession, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
