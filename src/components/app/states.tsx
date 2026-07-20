import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { colors } from "../../theme/tokens";
import { Button, Card, Text } from "../ui";

/**
 * `themed` opts these shared states into the dark/light theme (same pattern as
 * Card/Button). It only diverges from the legacy emerald look when the active
 * theme is dark — so non-migrated screens (which still have light backgrounds
 * even under a dark OS theme) keep their legible emerald states.
 */
interface Themable {
  themed?: boolean;
}

/** Placeholder card shown while the discover list loads. */
export function EventCardSkeleton({ themed = false }: Themable) {
  const theme = useTheme();
  const dark = themed && theme.mode === "dark";
  const blockColor = dark ? theme.background.surfaceElevated : undefined;
  const block = (extra: string) => (
    <View className={dark ? `rounded ${extra}` : `rounded bg-hairline ${extra}`} style={dark ? { backgroundColor: blockColor } : undefined} />
  );

  const inner = (
    <>
      <View className={dark ? "h-32 w-full" : "h-32 w-full bg-hairline"} style={dark ? { backgroundColor: blockColor } : undefined} />
      <View className="gap-2 p-4">
        {block("h-4 w-3/4")}
        {block("h-3 w-1/2")}
        {block("h-3 w-2/5")}
      </View>
    </>
  );

  return dark ? (
    <Card themed padded={false} style={{ overflow: "hidden" }}>
      {inner}
    </Card>
  ) : (
    <Card className="overflow-hidden p-0">{inner}</Card>
  );
}

export function SkeletonList({ count = 4, themed = false }: { count?: number } & Themable) {
  return (
    <View className="gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} themed={themed} />
      ))}
    </View>
  );
}

export function EmptyState({
  title = "No events found",
  message = "Try a different category, widen the distance, or check back soon.",
  themed = false,
}: {
  title?: string;
  message?: string;
} & Themable) {
  const theme = useTheme();
  const dark = themed && theme.mode === "dark";
  return (
    <View className="items-center gap-2 px-6 py-16">
      <Ionicons name="calendar-outline" size={40} color={dark ? theme.text.tertiary : colors.faint} />
      <Text weight="semibold" className="text-center text-lg" style={dark ? { color: theme.text.primary } : undefined}>
        {title}
      </Text>
      <Text tone="muted" className="text-center" style={dark ? { color: theme.text.secondary } : undefined}>
        {message}
      </Text>
    </View>
  );
}

export function ErrorState({
  message = "Something went wrong loading events.",
  onRetry,
  themed = false,
}: {
  message?: string;
  onRetry: () => void;
} & Themable) {
  const theme = useTheme();
  const dark = themed && theme.mode === "dark";
  return (
    <View className="items-center gap-3 px-6 py-16">
      <Ionicons name="cloud-offline-outline" size={40} color={dark ? theme.text.tertiary : colors.faint} />
      <Text tone="muted" className="text-center" style={dark ? { color: theme.text.secondary } : undefined}>
        {message}
      </Text>
      <Button variant="secondary" label="Try again" onPress={onRetry} themed={dark} />
    </View>
  );
}
