import { Image } from "react-native";

import { colors } from "../../theme/tokens";

// The gada logomark (wordmark inside the oval frame). Source art is white-on-
// transparent; we tint it at render time.
const LOGO_SOURCE = require("../../../assets/images/gada-logo.png");
const ASPECT_RATIO = 829 / 466; // intrinsic px of the asset

export interface LogoProps {
  /** Rendered height in px (width derives from the aspect ratio). Default 56. */
  height?: number;
  /**
   * Tint colour. Brand rule (hard): the gada mark is always near-black `ink`
   * on a light surface — never recoloured to brand/coral. Only override for a
   * genuinely dark surface (e.g. `colors.surface` on an ink background).
   */
  tint?: string;
}

export function Logo({ height = 56, tint = colors.ink }: LogoProps) {
  return (
    <Image
      source={LOGO_SOURCE}
      accessibilityRole="image"
      accessibilityLabel="gada"
      resizeMode="contain"
      style={{ height, width: height * ASPECT_RATIO, tintColor: tint }}
    />
  );
}
