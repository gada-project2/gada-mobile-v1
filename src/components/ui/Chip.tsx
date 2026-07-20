import type { ReactNode } from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";

type Variant = "default" | "going" | "interested" | "category";

export interface ChipProps {
  label: string;
  variant?: Variant;
  icon?: ReactNode;
  /** Colour of the icon circle for `category` chips (defaults to the accent). */
  circleColor?: string;
  /** Filter-chip selected state (affects `default` and `category`). */
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * Themed pill chip (reads useTheme()). `going`/`interested` are the mockup's
 * filled status pills (purple / orange); `category` gets an icon-in-circle
 * treatment for the Music/Business/Food/… selector rows; `default` is a plain
 * filter chip that highlights when `selected`.
 */
export function Chip({ label, variant = "default", icon, circleColor, selected, onPress, style }: ChipProps) {
  const theme = useTheme();

  // Resolve container + text colours per variant.
  let bg = theme.background.surfaceElevated;
  let border = theme.border;
  let fg = theme.text.secondary;

  if (variant === "going") {
    bg = theme.status.going;
    border = theme.status.going;
    fg = "#FFFFFF";
  } else if (variant === "interested") {
    bg = theme.status.interested;
    border = theme.status.interested;
    fg = "#FFFFFF";
  } else if (selected) {
    // default / category, selected -> accent tint + accent border/text.
    bg = theme.background.surfaceElevated;
    border = theme.accent.primary;
    fg = theme.text.primary;
  }

  const content = (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs + 2,
          alignSelf: "flex-start",
          minHeight: 32,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs + 2,
          borderRadius: radius.full,
          borderWidth: 1,
          backgroundColor: bg,
          borderColor: border,
        },
        style,
      ]}
    >
      {variant === "category" && icon ? (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: circleColor ?? (selected ? theme.accent.primary : theme.background.surface),
          }}
        >
          {icon}
        </View>
      ) : (
        icon ?? null
      )}
      <Text
        style={{
          color: fg,
          fontFamily: typography.family.medium,
          fontSize: typography.size.sm,
        }}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
    >
      {content}
    </Pressable>
  );
}
