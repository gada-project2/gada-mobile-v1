import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

import { colors } from "../../theme/tokens";
import { Button, Card, Text } from "../ui";

/** Placeholder card shown while the discover list loads. */
export function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <View className="h-32 w-full bg-hairline" />
      <View className="gap-2 p-4">
        <View className="h-4 w-3/4 rounded bg-hairline" />
        <View className="h-3 w-1/2 rounded bg-hairline" />
        <View className="h-3 w-2/5 rounded bg-hairline" />
      </View>
    </Card>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View className="gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function EmptyState({
  title = "No events found",
  message = "Try a different category, widen the distance, or check back soon.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <View className="items-center gap-2 px-6 py-16">
      <Ionicons name="calendar-outline" size={40} color={colors.faint} />
      <Text weight="semibold" className="text-center text-lg">
        {title}
      </Text>
      <Text tone="muted" className="text-center">
        {message}
      </Text>
    </View>
  );
}

export function ErrorState({
  message = "Something went wrong loading events.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <View className="items-center gap-3 px-6 py-16">
      <Ionicons name="cloud-offline-outline" size={40} color={colors.faint} />
      <Text tone="muted" className="text-center">
        {message}
      </Text>
      <Button variant="secondary" label="Try again" onPress={onRetry} />
    </View>
  );
}
