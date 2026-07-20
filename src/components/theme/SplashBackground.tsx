import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { ImageBackground, StyleSheet } from "react-native";

/**
 * Full-bleed concert background for the welcome/onboarding splash.
 *
 * The image is landscape (~1844x853), so `cover` crops the left/right edges to
 * fill a portrait screen — keeping the raised hands + stage lights centred, per
 * the mockup. A dark-purple gradient darkens the top and (most heavily) the
 * bottom, so white logo/text reads clearly, with the darkest point at the very
 * bottom where the tagline sits.
 */
export function SplashBackground({ children }: { children: ReactNode }) {
  return (
    <ImageBackground
      source={require("../../../assets/images/concert-bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={[
          "rgba(14,6,33,0.75)", // dark purple overlay, top
          "rgba(14,6,33,0.4)", // lighter through the middle
          "rgba(14,6,33,0.95)", // near-solid at the bottom (tagline sits here)
        ]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: "100%", height: "100%" },
});
