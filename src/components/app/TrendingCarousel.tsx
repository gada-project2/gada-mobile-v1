import { ScrollView, View } from "react-native";

import type { Gadaring } from "../../lib/api/types";
import { Text } from "../ui";
import { EventCard } from "./EventCard";
import { EventCardSkeleton } from "./states";

export interface TrendingCarouselProps {
  events: Gadaring[];
  loading: boolean;
}

const CARD_WIDTH = 260;

/** Horizontal "Trending near you" carousel. Hides itself when empty + not loading. */
export function TrendingCarousel({ events, loading }: TrendingCarouselProps) {
  if (!loading && events.length === 0) return null;

  return (
    <View className="gap-3">
      <Text weight="semibold" className="text-lg">
        Trending near you
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {loading && events.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <View key={i} style={{ width: CARD_WIDTH }}>
                <EventCardSkeleton />
              </View>
            ))
          : events.map((event) => (
              <View key={event.id} style={{ width: CARD_WIDTH }}>
                <EventCard event={event} variant="compact" />
              </View>
            ))}
      </ScrollView>
    </View>
  );
}
