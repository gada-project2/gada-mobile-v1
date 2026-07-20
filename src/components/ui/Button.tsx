import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, type PressableProps } from "react-native";

import { cn } from "../../lib/cn";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  /** Trigger a light haptic on press (default true). */
  haptic?: boolean;
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
  disabled,
  onPress,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(e) => {
        if (haptic) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress?.(e);
      }}
      className={cn(
        containerBase,
        variantContainer[variant],
        isDisabled && "opacity-50",
        className,
      )}
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
