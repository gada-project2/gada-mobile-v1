// SINGLE SOURCE OF TRUTH for the new dark/light theme palette.
//
// Consumed by BOTH:
//   • src/theme/tokens.ts  -> runtime `useTheme()` (JS-driven styling)
//   • tailwind.config.js   -> `className` utilities (bg-app-*, text-app-*)
// so the two systems can never drift. Plain CommonJS on purpose: Tailwind's
// Node config can `require()` it, and TS imports it via allowJs.
//
// NOTE: this is the NEW themeable design system. The current emerald design
// tokens still live as `colors` in tokens.ts and the un-namespaced Tailwind
// colors — this stage only adds infrastructure, it does not replace them.

const dark = {
  background: {
    primary: "#0E0621",
    surface: "#1A0F2E",
    surfaceElevated: "#241640",
    gradient: ["#1A0F2E", "#0E0621"], // for gradient backgrounds
  },
  accent: {
    primary: "#8B5CF6",
    primaryPressed: "#7C3AED",
    secondary: "#EC4899",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "#B4A7D6",
    tertiary: "#6B5B95",
    inverse: "#0E0621",
  },
  border: "rgba(255,255,255,0.08)",
  status: {
    going: "#8B5CF6",
    interested: "#F97316",
    success: "#22C55E",
    error: "#EF4444",
  },
  overlay: "rgba(14,6,33,0.6)",
};

const light = {
  background: {
    primary: "#FAF9FC",
    surface: "#FFFFFF",
    surfaceElevated: "#F3F0FA",
    gradient: ["#F3F0FA", "#FAF9FC"],
  },
  accent: {
    primary: "#7C3AED",
    primaryPressed: "#6D28D9",
    secondary: "#DB2777",
  },
  text: {
    primary: "#1A0F2E",
    secondary: "#5B4A7A",
    tertiary: "#9385B0",
    inverse: "#FFFFFF",
  },
  border: "rgba(0,0,0,0.06)",
  status: {
    going: "#7C3AED",
    interested: "#EA580C",
    success: "#16A34A",
    error: "#DC2626",
  },
  overlay: "rgba(0,0,0,0.4)",
};

// Layout scales (8px grid; generously rounded cards).
const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };
const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

module.exports = { dark, light, radius, spacing };
