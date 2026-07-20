import { Image } from "expo-image";
import { Text, View, type ViewStyle } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { typography } from "../../theme/tokens";

type Size = "xs" | "sm" | "md" | "lg";

export interface AvatarProps {
  uri?: string | null;
  /** Used for the initials fallback when there's no image. */
  name?: string;
  size?: Size;
  /** Optional coloured ring (online status, "you" indicator, etc.). */
  ringColor?: string;
  style?: ViewStyle;
}

const DIM: Record<Size, number> = { xs: 24, sm: 32, md: 40, lg: 80 };
const FONT: Record<Size, number> = {
  xs: typography.size.xs,
  sm: typography.size.sm,
  md: typography.size.base,
  lg: typography.size["3xl"],
};

/**
 * Circular avatar with an initials fallback. Reuses the app's proven safe
 * optional-chained name logic (see the home greeting) so a missing/blank name
 * degrades to "?" instead of throwing.
 */
export function Avatar({ uri, name, size = "md", ringColor, style }: AvatarProps) {
  const theme = useTheme();
  const dim = DIM[size];
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?";

  const ring: ViewStyle = ringColor
    ? { borderWidth: 2, borderColor: ringColor, padding: 2 }
    : {};

  return (
    <View
      style={[
        { width: dim + (ringColor ? 8 : 0), height: dim + (ringColor ? 8 : 0), borderRadius: 9999, alignItems: "center", justifyContent: "center" },
        ring,
        style,
      ]}
    >
      {uri ? (
        <Image
          source={uri}
          style={{ width: dim, height: dim, borderRadius: 9999 }}
          contentFit="cover"
          transition={150}
          accessibilityRole="image"
          accessibilityLabel={name ? `${name} avatar` : "Avatar"}
        />
      ) : (
        <View
          style={{
            width: dim,
            height: dim,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.accent.primary,
          }}
          accessibilityRole="image"
          accessibilityLabel={name ? `${name} avatar` : "Avatar"}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: typography.family.semibold,
              fontSize: FONT[size],
            }}
          >
            {initial}
          </Text>
        </View>
      )}
    </View>
  );
}
