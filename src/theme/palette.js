// SINGLE SOURCE OF TRUTH for the new dark/light theme palette.
//
// Consumed by BOTH:
//   • src/theme/tokens.ts  -> runtime `useTheme()` (JS-driven styling)
//   • tailwind.config.js   -> `className` utilities (bg-app-*, text-app-*)
// so the two systems can never drift. Plain CommonJS on purpose: Tailwind's
// Node config can `require()` it, and TS imports it via allowJs/esModuleInterop.
//
// This is the NEW themeable design system (the "design system realignment"
// spec values). The legacy emerald tokens still live as `colors`/`radii` in
// tokens.ts and the un-namespaced Tailwind colors — untouched by this file.
//
// BACK-COMPAT: consumers still read text.primary/tertiary/inverse and
// status.error. The spec renamed these (heading/body/secondary/disabled and
// danger), so we keep the old keys as ALIASES to avoid a 47-file rename sweep:
//   text.primary  -> heading
//   text.tertiary -> disabled   (tertiary is the FAINT level in usage, so it
//                                maps to `disabled`, not `secondary`; the spec
//                                left this to "check usage before deciding")
//   text.inverse  -> kept (unused today, retained for the Theme contract)
//   status.error  -> danger

const primaryScale = {
  900: "#2B0E6D",
  800: "#4318D1",
  700: "#5B21F4",
  600: "#6D3BFF", // main
  500: "#845EFF",
  400: "#A07CFF",
  300: "#C5B5FF",
  200: "#E2D9FF",
  100: "#F4F1FF",
};

const secondary = {
  pink: "#FF5BA5",
  orange: "#FF8C42",
  gold: "#FFC247",
  skyBlue: "#37C6FF",
  emerald: "#17C964",
};

const dark = {
  mode: "dark",
  background: {
    primary: "#09090B",
    surface: "#1A1A22",
    surfaceElevated: "#121218", // "Card" in spec
    hover: "#24242D",
    gradient: ["#09090B", "#1E1B4B"], // "Dark" gradient
  },
  border: "#2D2D39",
  accent: {
    primary: primaryScale[600], // #6D3BFF
    primaryPressed: primaryScale[700], // #5B21F4
    secondary: secondary.pink,
  },
  text: {
    heading: "#FFFFFF",
    body: "#D4D4D8",
    secondary: "#A1A1AA",
    disabled: "#71717A",
    // back-compat aliases:
    primary: "#FFFFFF", // = heading
    tertiary: "#71717A", // = disabled (faint level)
    inverse: "#09090B",
  },
  status: {
    success: "#17C964",
    warning: "#FFB020",
    danger: "#F31260",
    info: "#0091FF",
    going: primaryScale[600],
    interested: secondary.orange,
    error: "#F31260", // = danger (back-compat alias)
  },
  overlay: "rgba(9,9,11,0.6)",
};

const light = {
  mode: "light",
  background: {
    primary: "#F8F9FC",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    divider: "#ECEEF4",
    gradient: ["#F8F9FC", "#FFFFFF"],
  },
  border: "#E9EAF2",
  accent: {
    primary: primaryScale[600],
    primaryPressed: primaryScale[700],
    secondary: secondary.pink,
  },
  text: {
    heading: "#111827",
    body: "#374151",
    secondary: "#6B7280",
    disabled: "#9CA3AF",
    // back-compat aliases:
    primary: "#111827", // = heading
    tertiary: "#9CA3AF", // = disabled (faint level)
    inverse: "#FFFFFF",
  },
  status: {
    success: "#17C964",
    warning: "#FFB020",
    danger: "#F31260",
    info: "#0091FF",
    going: primaryScale[600],
    interested: secondary.orange,
    error: "#F31260", // = danger (back-compat alias)
  },
  overlay: "rgba(0,0,0,0.4)",
};

const categoryColors = {
  MUSIC: "#7C3AED",
  FOOD: "#FB923C",
  BUSINESS: "#3B82F6",
  SPORT: "#10B981",
  FAITH: "#FBBF24",
  EDUCATION: "#14B8A6",
  PARTY: "#EC4899",
  COMMUNITY: "#6366F1",
  OTHER: primaryScale[500], // fallback for enum values not in the spec list
};

const gradients = {
  main: [primaryScale[700], "#9D4EDD"],
  hero: ["#2B0E6D", primaryScale[600], "#C084FC"],
  dark: ["#09090B", "#1E1B4B"],
};

const radius = { sm: 10, md: 16, lg: 24, xl: 32, full: 999 };

const spacing = {
  // full 11-step scale per "never use random spacing"
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 56,
  giant: 64,
};

const shadow = {
  card: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 },
  floating: { shadowColor: primaryScale[600], shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 32, elevation: 8 },
};

const layout = {
  bottomNavHeight: 76,
  fabSize: 64,
  inputHeight: 56,
  inputRadius: 18,
  avatarSize: { xs: 24, sm: 32, md: 40, lg: 56, xl: 72 },
  iconSize: { sm: 16, md: 20, base: 24, lg: 28, xl: 32 },
};

module.exports = {
  primaryScale,
  secondary,
  dark,
  light,
  categoryColors,
  gradients,
  radius,
  spacing,
  shadow,
  layout,
};
