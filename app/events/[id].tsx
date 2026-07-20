import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SegmentedControl, type Segment } from "../../src/components/app/SegmentedControl";
import { ErrorState } from "../../src/components/app/states";
import { TicketsTab } from "../../src/components/app/TicketsTab";
import { VenueMap } from "../../src/components/app/VenueMap";
import { VolunteersTab } from "../../src/components/app/VolunteersTab";
import { Avatar, Button, Card, Pill, Text } from "../../src/components/ui";
import { ApiError } from "../../src/lib/api/client";
import type { Gadaring, PingPoint } from "../../src/lib/api/types";
import { categoryMeta } from "../../src/lib/categories";
import { formatEventRange } from "../../src/lib/dates";
import { goingCount, isFreeEvent, isLive, priceLabel } from "../../src/lib/gadaring-display";
import { openDirections } from "../../src/lib/maps";
import { useResolvedMedia } from "../../src/lib/queries/storage";
import {
  useGadaring,
  useInterestStatus,
  usePingPoints,
  useTickets,
  useToggleInterest,
} from "../../src/lib/queries/gadarings";
import { useTheme } from "../../src/theme/ThemeProvider";
import { colors } from "../../src/theme/tokens";

type IoniconName = keyof typeof Ionicons.glyphMap;
type TabKey = "overview" | "tickets" | "volunteers" | "chat" | "map" | "attendees";

const TABS: Segment<TabKey>[] = [
  { key: "overview", label: "Overview" },
  { key: "tickets", label: "Tickets" },
  { key: "volunteers", label: "Volunteers" },
  { key: "chat", label: "Chat" },
  { key: "map", label: "Map" },
  { key: "attendees", label: "Attendees" },
];

/** Circular translucent overlay button sitting on top of the hero image. */
function OverlayButton({
  icon,
  onPress,
  label,
  active,
  top,
  side,
}: {
  icon: IoniconName;
  onPress: () => void;
  label: string;
  active?: boolean;
  top: number;
  side: { left: number } | { right: number };
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={8}
      style={{ position: "absolute", top, ...side, zIndex: 10 }}
      className="h-10 w-10 items-center justify-center rounded-pill bg-black/40"
    >
      <Ionicons name={icon} size={20} color={active ? "#FF6B6B" : "#FFFFFF"} />
    </Pressable>
  );
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const dark = theme.mode === "dark";
  const [tab, setTab] = useState<TabKey>("overview");

  const detail = useGadaring(id);
  const event = detail.data;

  // Per-user interest — detail-only (the list carries no per-user fields).
  const interest = useInterestStatus(id);
  const toggleInterest = useToggleInterest(id);
  const isInterested = interest.data ?? false;

  // Fetch a tab's data only once its tab is opened (cached thereafter).
  const tickets = useTickets(tab === "tickets" ? id : undefined);
  const pings = usePingPoints(tab === "map" ? id : undefined);

  // Resolve R2 keys -> signed URLs (hooks must run before early returns).
  const banner = useResolvedMedia(detail.data?.bannerKey ?? detail.data?.photoKey).data ?? null;
  const hostAvatar = useResolvedMedia(detail.data?.convener?.photoKey).data ?? null;

  const bg = dark ? { backgroundColor: theme.background.primary } : undefined;

  if (detail.isLoading) {
    return (
      <View className={dark ? "flex-1" : "flex-1 bg-page"} style={bg}>
        <BackButton />
        <View className="h-72 w-full bg-hairline" style={dark ? { backgroundColor: theme.background.surface } : undefined} />
        <View className="gap-3 p-5">
          <View className="h-6 w-3/4 rounded bg-hairline" />
          <View className="h-4 w-1/2 rounded bg-hairline" />
          <View className="h-4 w-2/5 rounded bg-hairline" />
        </View>
      </View>
    );
  }

  if (detail.isError || !event) {
    const status = detail.error instanceof ApiError ? detail.error.status : 0;
    const { title, message } =
      status === 404
        ? { title: "Event not found", message: "This event may have been removed." }
        : status === 403
          ? { title: "Private event", message: "You don't have access to this event." }
          : { title: "Couldn't load event", message: "Please check your connection and try again." };
    return (
      <View className={dark ? "flex-1" : "flex-1 bg-page"} style={bg}>
        <BackButton />
        <View className="flex-1 justify-center">
          <ErrorState message={`${title}. ${message}`} onRetry={() => detail.refetch()} themed={dark} />
        </View>
      </View>
    );
  }

  const meta = categoryMeta(event.category);
  const live = isLive(event);
  const cancelled = event.status === "CANCELLED";
  const going = goingCount(event);
  const free = isFreeEvent(event);
  const purchased = !!event.myPurchase;
  const hasCoords = typeof event.latitude === "number" && typeof event.longitude === "number";

  // Date badge (day number + short month) from the start date.
  const start = event.startDate ? new Date(event.startDate) : null;
  const badgeDay = start ? String(start.getDate()) : "";
  const badgeMonth = start ? start.toLocaleString("en", { month: "short" }).toUpperCase() : "";

  const textPrimary = dark ? { color: theme.text.primary } : undefined;
  const textSecondary = dark ? { color: theme.text.secondary } : undefined;

  const share = () => {
    Haptics.selectionAsync().catch(() => {});
    Share.share({
      message: `${event.name}${event.venue ? ` · ${event.venue}` : ""}${
        event.startDate ? ` · ${formatEventRange(event.startDate, event.endDate)}` : ""
      }\nCheck it out on gada.`,
    }).catch(() => {});
  };

  return (
    <View className={dark ? "flex-1" : "flex-1 bg-page"} style={bg}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={detail.isRefetching}
            onRefresh={() => detail.refetch()}
            tintColor={dark ? theme.accent.primary : colors.brand}
          />
        }
      >
        {/* Hero image (single banner — the API has no gallery, so no counter). */}
        <View style={{ height: 300, backgroundColor: meta.color }} className="w-full items-center justify-center">
          {banner ? (
            <Image source={banner} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
          ) : (
            <Ionicons name={meta.icon as IoniconName} size={72} color="rgba(255,255,255,0.92)" />
          )}
          <BackButton />
          <OverlayButton icon="share-outline" onPress={share} label="Share event" top={insets.top + 8} side={{ right: 60 }} />
          {!cancelled ? (
            <OverlayButton
              icon={isInterested ? "heart" : "heart-outline"}
              active={isInterested}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                toggleInterest.mutate(!isInterested);
              }}
              label={isInterested ? "Remove interest" : "Save to interested"}
              top={insets.top + 8}
              side={{ right: 12 }}
            />
          ) : null}
        </View>

        {/* Content card overlaps the image; floating date badge on its top edge. */}
        <View
          style={[
            { marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
            dark ? { backgroundColor: theme.background.primary } : { backgroundColor: colors.page },
          ]}
        >
          {/* Floating date badge */}
          {start ? (
            <Card
              themed={dark}
              padded={false}
              style={{ position: "absolute", right: 20, top: -28, width: 64, alignItems: "center", paddingVertical: 8 }}
              className={dark ? undefined : "border border-hairline bg-surface"}
            >
              <Text weight="semibold" className="text-xl" style={textPrimary}>
                {badgeDay}
              </Text>
              <Text weight="medium" tone="muted" className="text-xs" style={textSecondary}>
                {badgeMonth}
              </Text>
            </Card>
          ) : null}

          <View className="gap-3 p-5 pt-6">
            <View className="flex-row items-center gap-2">
              {live ? <Pill tone="coral" label="Live now" /> : <Pill tone="neutral" label={meta.label} />}
              {event.status === "PUBLISHED" ? <Pill tone="brand" label="Upcoming" /> : null}
              {event.status === "COMPLETED" ? <Pill tone="neutral" label="Ended" /> : null}
              {purchased ? (
                event.myPurchase?.status === "CHECKED_IN" || event.myPurchase?.checkedInAt ? (
                  <Pill tone="neutral" label="Checked in" />
                ) : (
                  <Pill tone="brand" label="You're going" />
                )
              ) : null}
              {isInterested ? <Pill tone="invited" label="Interested" /> : null}
            </View>

            <Text weight="semibold" className="text-2xl" style={textPrimary} numberOfLines={2}>
              {event.name}
            </Text>

            {/* Organizer (real convener: name + avatar. No "verified" field exists — none shown). */}
            {event.convener?.displayName ? (
              <View className="flex-row items-center gap-2">
                <Avatar uri={hostAvatar} name={event.convener.displayName} size="sm" />
                <View>
                  <Text tone="faint" className="text-xs" style={dark ? { color: theme.text.tertiary } : undefined}>
                    Hosted by
                  </Text>
                  <Text weight="medium" style={textPrimary}>
                    {event.convener.displayName}
                  </Text>
                </View>
              </View>
            ) : null}

            <View className="gap-2 pt-1">
              <InfoRow icon="calendar-outline" text={formatEventRange(event.startDate, event.endDate)} dark={dark} />
              {event.venue ? (
                <View className="flex-row items-center justify-between gap-2">
                  <InfoRow icon="location-outline" text={event.venue} dark={dark} />
                  {hasCoords ? (
                    <Pressable
                      onPress={() => openDirections(event.latitude as number, event.longitude as number, event.venue)}
                      accessibilityRole="button"
                      accessibilityLabel="Map and directions"
                      hitSlop={8}
                    >
                      <Text weight="medium" tone="brand-ink" className="text-sm" style={dark ? { color: theme.accent.primary } : undefined}>
                        Map & directions
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <InfoRow icon="people-outline" text={`${going} going`} dark={dark} />
            </View>

            {cancelled ? (
              <View className="rounded-md bg-coral-tint px-4 py-3">
                <Text tone="coral-ink" className="text-sm">
                  This event was cancelled.
                </Text>
              </View>
            ) : null}
          </View>

          <SegmentedControl segments={TABS} value={tab} onChange={setTab} dark={dark} />

          <View className="gap-3 p-5">
            {tab === "overview" && <OverviewTab event={event} dark={dark} />}
            {tab === "tickets" && (
              <TicketsTab
                gadaringId={event.id}
                loading={tickets.isLoading}
                error={tickets.isError}
                data={tickets.data}
                onRetry={() => tickets.refetch()}
              />
            )}
            {tab === "volunteers" && <VolunteersTab gadaringId={event.id} />}
            {tab === "chat" && <EventChatTab id={event.id} title={event.name} />}
            {tab === "map" && (
              <MapTab event={event} loading={pings.isLoading} error={pings.isError} data={pings.data} onRetry={() => pings.refetch()} />
            )}
            {tab === "attendees" && <AttendeesTab going={going} dark={dark} />}
          </View>
        </View>
      </ScrollView>

      {/* Sticky price + CTA bar. Same purchase flow — "Get ticket" opens the
          Tickets tab (where the real mutation lives); "View ticket" jumps to the
          purchased e-ticket. */}
      {!cancelled ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingBottom: insets.bottom + 12,
            paddingTop: 12,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            borderTopWidth: 1,
            borderTopColor: dark ? theme.border : colors.hairline,
            backgroundColor: dark ? theme.background.surface : colors.surface,
          }}
        >
          <View>
            <Text tone="faint" className="text-xs" style={dark ? { color: theme.text.tertiary } : undefined}>
              {free ? "Entry" : "From"}
            </Text>
            <Text weight="semibold" className="text-lg" style={textPrimary}>
              {free ? "Free" : priceLabel(event).replace(/^From\s*/i, "")}
            </Text>
          </View>
          <View style={{ flex: 1, maxWidth: 200 }}>
            <Button
              themed={dark}
              label={purchased ? "View ticket" : "Get ticket"}
              onPress={() => {
                if (purchased && event.myPurchase?.id) {
                  router.push({ pathname: "/tickets/[purchaseId]", params: { purchaseId: event.myPurchase.id } });
                } else {
                  setTab("tickets");
                }
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function BackButton() {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      style={{ top: insets.top + 8, position: "absolute", left: 12, zIndex: 10 }}
      className="h-10 w-10 items-center justify-center rounded-pill bg-black/40"
    >
      <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
    </Pressable>
  );
}

function InfoRow({ icon, text, dark }: { icon: IoniconName; text: string; dark: boolean }) {
  const theme = useTheme();
  if (!text) return null;
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={16} color={dark ? theme.text.secondary : colors.muted} />
      <Text tone="muted" className="flex-1 text-sm" style={dark ? { color: theme.text.secondary } : undefined}>
        {text}
      </Text>
    </View>
  );
}

function TabLoading() {
  return (
    <View className="py-10">
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

function OverviewTab({ event, dark }: { event: Gadaring; dark: boolean }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const description = event.description?.trim();
  const long = !!description && description.length > 220;

  return (
    <View className="gap-3">
      <Text weight="semibold" className="text-lg" style={dark ? { color: theme.text.primary } : undefined}>
        About
      </Text>
      <Text
        tone={description ? "ink" : "muted"}
        numberOfLines={long && !expanded ? 4 : undefined}
        style={dark ? { color: description ? theme.text.secondary : theme.text.tertiary } : undefined}
      >
        {description || "No description yet."}
      </Text>
      {long ? (
        <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" hitSlop={6}>
          <Text weight="medium" tone="brand-ink" className="text-sm" style={dark ? { color: theme.accent.primary } : undefined}>
            {expanded ? "Show less" : "Read more"}
          </Text>
        </Pressable>
      ) : null}
      {event.gadaringRingId ? (
        <Text tone="faint" className="text-sm" style={dark ? { color: theme.text.tertiary } : undefined}>
          Ring ID: {event.gadaringRingId}
        </Text>
      ) : null}
    </View>
  );
}

function EventChatTab({ id, title }: { id: string; title: string }) {
  return (
    <View className="gap-3">
      <Text tone="muted">
        Read the event chat and vote on polls. Sending messages arrives with real-time chat.
      </Text>
      <Pressable
        onPress={() => router.push({ pathname: "/chat/[kind]/[id]", params: { kind: "event", id, title } })}
        accessibilityRole="button"
        accessibilityLabel="Open event chat"
        className="min-h-[44px] flex-row items-center justify-center gap-2 rounded-btn bg-brand px-5 py-3"
      >
        <Ionicons name="chatbubbles-outline" size={18} color="#FFFFFF" />
        <Text weight="semibold" tone="surface">
          Open event chat
        </Text>
      </Pressable>
    </View>
  );
}

function MapTab({
  event,
  loading,
  error,
  data,
  onRetry,
}: {
  event: Gadaring;
  loading: boolean;
  error: boolean;
  data?: PingPoint[];
  onRetry: () => void;
}) {
  if (loading) return <TabLoading />;
  if (error) return <ErrorState message="Couldn't load ping points." onRetry={onRetry} />;
  const points = data ?? [];
  const hasVenue = typeof event.latitude === "number" && typeof event.longitude === "number";
  const mappable = hasVenue || points.length > 0;

  return (
    <View className="gap-3">
      {mappable ? (
        <VenueMap latitude={event.latitude} longitude={event.longitude} label={event.venue ?? event.name} points={points} />
      ) : (
        <Text tone="muted">No location has been set for this event yet.</Text>
      )}

      {points.length > 0
        ? points.map((p) => (
            <Card key={p.id} className="gap-1">
              <View className="flex-row items-center gap-2">
                <Ionicons name="navigate-outline" size={16} color={colors.coral} />
                <Text weight="medium" className="flex-1">
                  {p.label}
                </Text>
              </View>
              {p.description ? (
                <Text tone="muted" className="text-sm">
                  {p.description}
                </Text>
              ) : null}
            </Card>
          ))
        : null}
    </View>
  );
}

function AttendeesTab({ going, dark }: { going: number; dark: boolean }) {
  const theme = useTheme();
  return (
    <View className="gap-2">
      <Text weight="semibold" className="text-3xl" style={dark ? { color: theme.text.primary } : undefined}>
        {going}
      </Text>
      <Text tone="muted" style={dark ? { color: theme.text.secondary } : undefined}>
        going to this event.
      </Text>
      {/* The API exposes only a count (ticketsSold); there is no public attendee
          list endpoint, so no "who's going" avatars are shown. */}
      <Text tone="faint" className="text-sm" style={dark ? { color: theme.text.tertiary } : undefined}>
        The attendee list is coming soon.
      </Text>
    </View>
  );
}
