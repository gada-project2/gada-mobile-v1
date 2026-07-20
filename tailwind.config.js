/** @type {import('tailwindcss').Config} */
// NativeWind v4 uses Tailwind CSS v3's config model (theme.extend + tailwind.config.js).

// New themeable design system — SAME SOURCE as src/theme/tokens.ts (they both
// consume ./src/theme/palette.js), so `useTheme()` and these className
// utilities can never drift. Namespaced `app-*` / `app-dark-*` to avoid
// colliding with the current emerald tokens (surface, ink, brand, …).
const palette = require("./src/theme/palette");
const flattenTheme = (t) => ({
  bg: t.background.primary,
  surface: t.background.surface,
  "surface-elevated": t.background.surfaceElevated,
  accent: t.accent.primary,
  "accent-pressed": t.accent.primaryPressed,
  "accent-secondary": t.accent.secondary,
  text: t.text.primary,
  "text-secondary": t.text.secondary,
  "text-tertiary": t.text.tertiary,
  "text-inverse": t.text.inverse,
  border: t.border,
  overlay: t.overlay,
  going: t.status.going,
  interested: t.status.interested,
  success: t.status.success,
  error: t.status.error,
});

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // Class-based dark mode; the ThemeProvider drives it via NativeWind's
  // colorScheme.set(), so `dark:` variants follow the user's theme choice.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // text
        ink: "#14181C",
        muted: "#5B636B",
        faint: "#9AA0A6",
        // surfaces
        page: "#F6F7F8",
        surface: "#FFFFFF",
        hairline: "#ECEEF0",
        "hairline-strong": "#E3E5E8",
        // brand (emerald) — primary actions
        brand: {
          DEFAULT: "#0E9F6E",
          ink: "#0F6E56",
          tint: "#E1F5EE",
        },
        // coral — live / happening now / urgent ONLY
        coral: {
          DEFAULT: "#FF6B4A",
          ink: "#993C1D",
          tint: "#FAECE7",
        },
        // status colours
        interested: "#E24B4A",
        invited: {
          DEFAULT: "#EF9F27",
          ink: "#854F0B",
          tint: "#FAEEDA",
        },
        attending: "#2FAE66",
        volunteering: {
          DEFAULT: "#378ADD",
          ink: "#185FA5",
          tint: "#E6F1FB",
        },
        // New themeable system (see palette.js). Use `bg-app-surface` for light
        // and `dark:bg-app-dark-surface` for dark, etc.
        app: flattenTheme(palette.light),
        "app-dark": flattenTheme(palette.dark),
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        btn: "11px",
        pill: "9999px",
      },
      fontFamily: {
        // Inter is loaded at runtime via @expo-google-fonts/inter.
        // RN custom fonts need an explicit family per weight (no synthetic bold),
        // so these are distinct keys (font-sans / font-sans-medium / font-sans-semibold)
        // to avoid clashing with Tailwind's font-medium / font-semibold weight utilities.
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
      },
    },
  },
  plugins: [],
};
