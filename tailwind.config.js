/** @type {import('tailwindcss').Config} */
// NativeWind v4 uses Tailwind CSS v3's config model (theme.extend + tailwind.config.js).
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
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
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
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
