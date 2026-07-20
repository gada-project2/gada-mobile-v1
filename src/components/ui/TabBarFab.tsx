import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../../theme/ThemeProvider";
import { primaryScale } from "../../theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TabBarFabProps {
  onPress?: () => void;
  /** Diameter in px (default 56). */
  size?: number;
  accessibilityLabel?: string;
}

/**
 * Floating circular "+" action for the tab bar centre. Luminous purple gradient
 * (matches the mockup's lit centre button), white bold "+", light haptic and a
 * subtle press scale on the UI thread (honours reduced-motion).
 *
 * Positioned to float above the bar line by its caller (negative margin) — see
 * app/(tabs)/_layout.tsx.
 */
export function TabBarFab({ onPress, size = 56, accessibilityLabel = "Create event" }: TabBarFabProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();

  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        if (!reduce) scale.value = withTiming(0.92, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 140 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          width: size,
          height: size,
          borderRadius: 9999,
          marginTop: -size / 3, // float above the bar line
          alignItems: "center",
          justifyContent: "center",
          // Soft glow. In dark mode this reads as a luminous halo; harmless in light.
          shadowColor: theme.accent.primary,
          shadowOpacity: 0.5,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        },
        aStyle,
      ]}
    >
      <LinearGradient
        colors={[primaryScale[400], theme.accent.primary]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: 9999,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="add" size={size * 0.55} color="#FFFFFF" />
      </LinearGradient>
    </AnimatedPressable>
  );
}
