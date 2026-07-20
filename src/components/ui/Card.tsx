import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import { cn } from "../../lib/cn";
import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing } from "../../theme/tokens";

export interface CardProps extends ViewProps {
  children: ReactNode;
  /** Opt in to the dark/light theme surface. Omit for the legacy emerald look. */
  themed?: boolean;
  /** surfaceElevated instead of surface (themed only). */
  elevated?: boolean;
  /** Apply spacing.md padding (default true; themed only). */
  padded?: boolean;
  className?: string;
}

/**
 * Surface container. Two modes:
 *  • default (no `themed`): the original white / hairline emerald card —
 *    unchanged, so existing screens render identically.
 *  • `themed`: reads useTheme() — background.surface(Elevated), radius.lg,
 *    1px theme.border, no heavy shadow in dark (layering, not drop-shadow).
 */
export function Card({
  children,
  themed = false,
  elevated = false,
  padded = true,
  className,
  style,
  ...props
}: CardProps) {
  const theme = useTheme();

  if (!themed) {
    return (
      <View className={cn("rounded-lg border border-hairline bg-surface p-4", className)} style={style} {...props}>
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: elevated ? theme.background.surfaceElevated : theme.background.surface,
          padding: padded ? spacing.md : 0,
          // Soft shadow reads better in light; dark relies on layering/opacity.
          ...(theme.mode === "light"
            ? { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 }
            : {}),
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
