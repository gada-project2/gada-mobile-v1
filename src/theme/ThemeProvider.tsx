import { colorScheme as nativewindColorScheme } from "nativewind";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

import { darkTheme, lightTheme, type Theme, type ThemeMode } from "./tokens";

// Non-sensitive preference; stored via the same expo-secure-store the app
// already uses (no AsyncStorage in this project). Key is namespaced like the
// refresh-token key in src/lib/auth/session.ts.
const THEME_MODE_KEY = "gada.themeMode";

interface ThemeContextValue {
  /** The resolved theme object to style with. */
  theme: Theme;
  /** The user's stored preference: "dark" | "light" | "system". */
  mode: ThemeMode;
  /** What "system" actually resolved to right now. */
  resolved: "dark" | "light";
  /** Persist a new preference and re-render. */
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // "light" | "dark" | null
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Hydrate the persisted override once on mount.
  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(THEME_MODE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === "dark" || stored === "light" || stored === "system") {
          setModeState(stored);
          nativewindColorScheme.set(stored);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    // Keep className `dark:` variants in lock-step with the JS theme.
    nativewindColorScheme.set(next);
    SecureStore.setItemAsync(THEME_MODE_KEY, next).catch(() => {});
  }, []);

  const resolved: "dark" | "light" =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
  const theme = resolved === "dark" ? darkTheme : lightTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, resolved, setMode }),
    [theme, mode, resolved, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The active theme object (dark or light). */
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx.theme;
}

/** The theme preference + setter, for the settings toggle. */
export function useThemeControls(): Pick<ThemeContextValue, "mode" | "resolved" | "setMode"> {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeControls must be used within a ThemeProvider");
  return { mode: ctx.mode, resolved: ctx.resolved, setMode: ctx.setMode };
}
