import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

import type { Gadaring } from "../../lib/api/types";
import { categoryMeta } from "../../lib/categories";
import { formatEventDate } from "../../lib/dates";
import {
  goingCount,
  isFreeEvent,
  isLive,
  priceLabel,
} from "../../lib/gadaring-display";
import { useResolvedMedia } from "../../lib/queries/storage";
import { colors } from "../../theme/tokens";
import { Card, Pill, Text } from "../ui";

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface EventCardProps {
  event: Gadaring;
  /** Compact variant for the trending carousel (fixed width). */
  variant?: "full" | "compact";
}

export function EventCard({ event, variant = "full" }: EventCardProps) {
  const meta = categoryMeta(event.category);
  const banner = useResolvedMedia(event.bannerKey ?? event.photoKey).data ?? null;
  const live = isLive(event);
  const going = goingCount(event);
  const free = isFreeEvent(event);

  const title = event.name ?? "Untitled gadaring";

  const open = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: "/events/[id]", params: { id: event.id } });
  };

  const bannerHeight = variant === "compact" ? 96 : 132;

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${meta.label}. ${going} going.`}
    >
      <Card className="overflow-hidden p-0">
        <View
          style={{ height: bannerHeight, backgroundColor: meta.color }}
          className="w-full items-center justify-center"
        >
          {banner ? (
            <Image
              source={banner}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Ionicons
              name={meta.icon as IoniconName}
              size={variant === "compact" ? 30 : 40}
              color="rgba(255,255,255,0.92)"
            />
          )}
          <View className="absolute left-3 top-3 flex-row gap-2">
            {live ? (
              <Pill tone="coral" label="Live now" />
            ) : (
              <View className="self-start rounded-pill bg-black/30 px-3 py-1">
                <Text weight="medium" tone="surface" className="text-xs">
                  {meta.label}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="gap-1.5 p-4">
          <Text weight="semibold" numberOfLines={2} className="text-base">
            {title}
          </Text>

          <View className="flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={14} color={colors.muted} />
            <Text tone="muted" className="text-sm" numberOfLines={1}>
              {formatEventDate(event.startDate)}
            </Text>
          </View>

          {event.venue ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="location-outline" size={14} color={colors.muted} />
              <Text tone="muted" className="text-sm" numberOfLines={1}>
                {event.venue}
              </Text>
            </View>
          ) : null}

          <View className="flex-row items-center justify-between pt-1">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="people-outline" size={14} color={colors.muted} />
              <Text tone="muted" className="text-sm">
                {going} going
              </Text>
            </View>
            <Pill tone={free ? "brand" : "neutral"} label={priceLabel(event)} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
