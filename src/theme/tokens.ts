// Design tokens, ported exactly from the web app (see CLAUDE.md).
// NativeWind className covers most styling; these raw values are for APIs that
// take colors directly (tab bar tints, status bar, icon `color`, etc.).

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
