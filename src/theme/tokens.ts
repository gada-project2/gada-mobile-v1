// Design tokens, ported exactly from the web app (see CLAUDE.md).
// NativeWind className covers most styling; these raw values are for APIs that
// take colors directly (tab bar tints, status bar, icon `color`, etc.).

import palette from "./palette";

export const colors = {
  ink: "#14181C",
  muted: "#5B636B",
  faint: "#9AA0A6",

  page: "#F6F7F8",
  surface: "#FFFFFF",
  hairline: "#ECEEF0",
  hairlineStrong: "#E3E5E8",

  brand: "#0E9F6E",
  brandInk: "#0F6E56",
  brandTint: "#E1F5EE",

  coral: "#FF6B4A",
  coralInk: "#993C1D",
  coralTint: "#FAECE7",

  interested: "#E24B4A",
  invited: "#EF9F27",
  invitedInk: "#854F0B",
  invitedTint: "#FAEEDA",
  attending: "#2FAE66",
  volunteering: "#378ADD",
  volunteeringInk: "#185FA5",
  volunteeringTint: "#E6F1FB",
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  btn: 11,
  pill: 9999,
} as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
} as const;

// ---------------------------------------------------------------------------
// NEW themeable design system (dark/light). Additive — the emerald `colors`
// above remain the current system; screens migrate to this later. Raw values
// come from ./palette.js, the single source shared with tailwind.config.js.
// ---------------------------------------------------------------------------

/** A resolved theme object returned by `useTheme()`. */
export interface Theme {
  mode: "dark" | "light";
  background: {
    primary: string;
    surface: string;
    surfaceElevated: string;
    /** dark only. */
    hover?: string;
    /** light only. */
    divider?: string;
    /** [from, to] for gradient backgrounds (e.g. expo-linear-gradient). */
    gradient: readonly [string, string];
  };
  accent: { primary: string; primaryPressed: string; secondary: string };
  /**
   * `heading`/`body`/`secondary`/`disabled` are the spec's scale. `primary`
   * (=heading), `tertiary` (=disabled) and `inverse` are retained back-compat
   * aliases so existing consumers keep working.
   */
  text: {
    heading: string;
    body: string;
    secondary: string;
    disabled: string;
    primary: string;
    tertiary: string;
    inverse: string;
  };
  border: string;
  /** `danger` is the spec name; `error` is a retained alias. */
  status: {
    going: string;
    interested: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    error: string;
  };
  overlay: string;
}

/** The user's theme preference (persisted). "system" follows the OS. */
export type ThemeMode = "dark" | "light" | "system";

export const darkTheme: Theme = {
  mode: "dark",
  background: {
    ...palette.dark.background,
    gradient: [palette.dark.background.gradient[0], palette.dark.background.gradient[1]] as const,
  },
  accent: palette.dark.accent,
  text: palette.dark.text,
  border: palette.dark.border,
  status: palette.dark.status,
  overlay: palette.dark.overlay,
};

export const lightTheme: Theme = {
  mode: "light",
  background: {
    ...palette.light.background,
    gradient: [palette.light.background.gradient[0], palette.light.background.gradient[1]] as const,
  },
  accent: palette.light.accent,
  text: palette.light.text,
  border: palette.light.border,
  status: palette.light.status,
  overlay: palette.light.overlay,
};

/** Border radius scale (px). Generously rounded cards; ~12px buttons/chips. */
export const radius = palette.radius as {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
};

/** Full spacing scale (spec: "never use random spacing"). */
export const spacing = palette.spacing as {
  xs: number;
  sm: number;
  md: number;
  base: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  huge: number;
  massive: number;
  giant: number;
};

/** Additional spec exports (single-sourced from palette.js). */
export const primaryScale = palette.primaryScale as Record<number, string>;
export const secondaryColors = palette.secondary as Record<string, string>;
export const categoryColors = palette.categoryColors as Record<string, string>;
export const gradients = palette.gradients as Record<string, string[]>;
export const shadow = palette.shadow as {
  card: object;
  floating: object;
};
export const layout = palette.layout as {
  bottomNavHeight: number;
  fabSize: number;
  inputHeight: number;
  inputRadius: number;
  avatarSize: Record<string, number>;
  iconSize: Record<string, number>;
};

/** Typography scale. Families map to the runtime-loaded Inter weights
 *  (all five are loaded in app/_layout.tsx). */
export const typography = {
  family: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    extrabold: "Inter_800ExtraBold",
  },
  size: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 36 },
  lineHeight: { xs: 16, sm: 20, base: 24, lg: 26, xl: 28, "2xl": 32, "3xl": 38, "4xl": 44 },
  weight: { regular: "400", medium: "500", semibold: "600", bold: "700", extrabold: "800" },
} as const;
