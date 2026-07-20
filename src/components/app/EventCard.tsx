import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, Text as RNText, View } from "react-native";

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
import { useTheme } from "../../theme/ThemeProvider";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import { Card, Pill, Text } from "../ui";

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface EventCardProps {
  event: Gadaring;
  /** `full`/`compact` = existing sizes; `hero` = large themed feature card. */
  variant?: "full" | "compact" | "hero";
  /** Opt in to the dark/light theme look. Omit for the legacy emerald card. */
  themed?: boolean;
}

export function EventCard({ event, variant = "full", themed = false }: EventCardProps) {
  const theme = useTheme();
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

  // ── Legacy path — unchanged, so the 5 existing consumers render identically.
  if (!themed) {
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
              <Image source={banner} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
            ) : (
              <Ionicons name={meta.icon as IoniconName} size={variant === "compact" ? 30 : 40} color="rgba(255,255,255,0.92)" />
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

  // ── Themed shared bits ────────────────────────────────────────────────────
  // NOTE: no Going/Interested badge here — the list endpoint (GET /events)
  // returns no per-user fields (confirmed against production), so a card can't
  // honestly know the viewer's status. That state lives on the event detail
  // screen only (myPurchase inline + a separate interest-status fetch).
  const categoryTag = live ? (
    <Pill tone="coral" label="Live now" />
  ) : (
    <View style={{ alignSelf: "flex-start", borderRadius: radius.full, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: spacing.md, paddingVertical: 4 }}>
      <RNText style={{ color: "#FFFFFF", fontFamily: typography.family.medium, fontSize: typography.size.xs }}>
        {meta.label}
      </RNText>
    </View>
  );

  const pricePill = (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: radius.full,
        backgroundColor: free ? theme.background.surfaceElevated : theme.accent.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
      }}
    >
      {!free ? <Ionicons name="ticket-outline" size={14} color="#FFFFFF" /> : null}
      <RNText
        style={{
          color: free ? theme.text.primary : "#FFFFFF",
          fontFamily: typography.family.semibold,
          fontSize: typography.size.sm,
        }}
      >
        {free ? "Free entry" : `Ticket ${priceLabel(event).toLowerCase()}`}
      </RNText>
    </View>
  );

  const metaRow = (icon: IoniconName, text: string, color: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Ionicons name={icon} size={14} color={color} />
      <RNText numberOfLines={1} style={{ color, fontFamily: typography.family.regular, fontSize: typography.size.sm, flexShrink: 1 }}>
        {text}
      </RNText>
    </View>
  );

  // ── Hero variant — large feature card with a bottom gradient scrim. ────────
  if (variant === "hero") {
    return (
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${title}. ${meta.label}. ${going} going.`}>
        <View style={{ height: 220, borderRadius: radius.lg, overflow: "hidden", backgroundColor: meta.color }}>
          {banner ? (
            <Image source={banner} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={meta.icon as IoniconName} size={56} color="rgba(255,255,255,0.92)" />
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.88)"]}
            locations={[0, 0.45, 1]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "70%" }}
          />
          <View style={{ position: "absolute", left: spacing.md, top: spacing.md }}>{categoryTag}</View>
          <View style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: spacing.md, gap: 6 }}>
            <RNText numberOfLines={2} style={{ color: "#FFFFFF", fontFamily: typography.family.semibold, fontSize: typography.size.xl }}>
              {title}
            </RNText>
            {metaRow("calendar-outline", formatEventDate(event.startDate), "rgba(255,255,255,0.9)")}
            {event.venue ? metaRow("location-outline", event.venue, "rgba(255,255,255,0.9)") : null}
            <View style={{ marginTop: 4 }}>{pricePill}</View>
          </View>
        </View>
      </Pressable>
    );
  }

  // ── Themed full / compact — Card container, image + details. ───────────────
  const imgHeight = variant === "compact" ? 110 : 140;
  return (
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${title}. ${meta.label}. ${going} going.`}>
      <Card themed padded={false} style={{ overflow: "hidden" }}>
        <View style={{ height: imgHeight, backgroundColor: meta.color, alignItems: "center", justifyContent: "center" }}>
          {banner ? (
            <Image source={banner} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
          ) : (
            <Ionicons name={meta.icon as IoniconName} size={variant === "compact" ? 30 : 40} color="rgba(255,255,255,0.92)" />
          )}
          <View style={{ position: "absolute", left: spacing.sm, top: spacing.sm }}>{categoryTag}</View>
        </View>
        <View style={{ padding: spacing.md, gap: 6 }}>
          <RNText numberOfLines={2} style={{ color: theme.text.primary, fontFamily: typography.family.semibold, fontSize: typography.size.base }}>
            {title}
          </RNText>
          {metaRow("calendar-outline", formatEventDate(event.startDate), theme.text.secondary)}
          {event.venue ? metaRow("location-outline", event.venue, theme.text.secondary) : null}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 2, gap: spacing.sm }}>
            {metaRow("people-outline", `${going} going`, theme.text.tertiary)}
            {pricePill}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
