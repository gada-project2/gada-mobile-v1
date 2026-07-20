// Typography scale (design-system realignment spec).
//
// ONE SOURCE OF TRUTH for font families: the bundled Inter weights loaded in
// app/_layout.tsx and declared in tokens.ts `typography.family`. RN custom
// fonts need an explicit family per weight (no synthetic bolding), so each
// numeric weight maps to its own bundled file — all five (400/500/600/700/800)
// are loaded, so none silently falls back to the system font.
import { typography as tokenTypography } from "./tokens";

/** Bundled Inter families, keyed by weight name (single-sourced from tokens). */
export const fontFamily = {
  regular: tokenTypography.family.regular, // Inter_400Regular
  medium: tokenTypography.family.medium, // Inter_500Medium
  semibold: tokenTypography.family.semibold, // Inter_600SemiBold
  bold: tokenTypography.family.bold, // Inter_700Bold
  extrabold: tokenTypography.family.extrabold, // Inter_800ExtraBold
} as const;

/** Numeric weight -> the correct bundled Inter family (pairs with `fontWeight`). */
export const fontFamilyByWeight = {
  "400": fontFamily.regular,
  "500": fontFamily.medium,
  "600": fontFamily.semibold,
  "700": fontFamily.bold,
  "800": fontFamily.extrabold,
} as const;

export const fontSize = {
  display: 48,
  hero: 40,
  h1: 34,
  h2: 28,
  h3: 24,
  title: 20,
  subtitle: 18,
  body: 16,
  small: 14,
  caption: 12,
  tiny: 10,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;
