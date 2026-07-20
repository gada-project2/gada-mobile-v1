import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, Text as RNText, type PressableProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { cn } from "../../lib/cn";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, typography } from "../../theme/tokens";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  /** Trigger a light haptic on press (default true). */
  haptic?: boolean;
  /** Opt in to the dark/light theme look + press-scale. Omit for the legacy emerald look. */
  themed?: boolean;
  className?: string;
}

// Emerald = primary actions only (brand rule). 44px min height for touch targets.
const containerBase =
  "min-h-[44px] flex-row items-center justify-center rounded-btn px-5 py-3";

const variantContainer: Record<Variant, string> = {
  primary: "bg-brand active:bg-brand-ink",
  secondary: "bg-surface border border-hairline-strong active:bg-hairline",
  ghost: "bg-transparent active:bg-hairline",
};

const variantText: Record<Variant, "surface" | "ink" | "brand-ink"> = {
  primary: "surface",
  secondary: "ink",
  ghost: "brand-ink",
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  haptic = true,
  themed = false,
  disabled,
  onPress,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = (e: Parameters<NonNullable<PressableProps["onPress"]>>[0]) => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  // ── Legacy path: unchanged from before, so existing screens render identically.
  if (!themed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={handlePress}
        className={cn(containerBase, variantContainer[variant], isDisabled && "opacity-50", className)}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : "#0E9F6E"} />
        ) : (
          <Text weight="semibold" tone={variantText[variant]}>
            {label}
          </Text>
        )}
      </Pressable>
    );
  }

  // ── Themed path: dark/light theme colours + subtle UI-thread press scale.
  return <ThemedButton {...{ label, variant, loading, isDisabled, disabled, handlePress }} {...props} />;
}

function ThemedButton({
  label,
  variant,
  loading,
  isDisabled,
  disabled,
  handlePress,
  onPressIn,
  onPressOut,
  style,
  ...props
}: {
  label: string;
  variant: Variant;
  loading: boolean;
  isDisabled: boolean;
  disabled?: boolean | null;
  handlePress: (e: Parameters<NonNullable<PressableProps["onPress"]>>[0]) => void;
} & Omit<PressableProps, "children" | "onPress" | "disabled">) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const container =
    variant === "primary"
      ? { backgroundColor: theme.accent.primary }
      : variant === "secondary"
        ? { backgroundColor: "transparent", borderWidth: 1, borderColor: theme.accent.primary }
        : { backgroundColor: "transparent" };
  const textColor =
    variant === "primary" ? "#FFFFFF" : variant === "secondary" ? theme.accent.primary : theme.text.primary;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPressIn={(e) => {
        if (!reduce) scale.value = withTiming(0.97, { duration: 80 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 120 });
        onPressOut?.(e);
      }}
      onPress={handlePress}
      style={[
        {
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.full,
          paddingHorizontal: 20,
          paddingVertical: 12,
          opacity: isDisabled ? 0.5 : 1,
        },
        container,
        aStyle,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <RNText style={{ color: textColor, fontFamily: typography.family.semibold, fontSize: typography.size.base }}>
          {label}
        </RNText>
      )}
    </AnimatedPressable>
  );
}
