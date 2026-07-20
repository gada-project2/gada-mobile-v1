import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SegmentedControl, type Segment } from "../../src/components/app/SegmentedControl";
import { ErrorState } from "../../src/components/app/states";
import { TicketsTab } from "../../src/components/app/TicketsTab";
import { VenueMap } from "../../src/components/app/VenueMap";
import { VolunteersTab } from "../../src/components/app/VolunteersTab";
import { Card, Pill, Text } from "../../src/components/ui";
import { ApiError } from "../../src/lib/api/client";
import type { Gadaring, PingPoint } from "../../src/lib/api/types";
import { categoryMeta } from "../../src/lib/categories";
import { formatEventRange } from "../../src/lib/dates";
import { goingCount, isLive } from "../../src/lib/gadaring-display";
import { useResolvedMedia } from "../../src/lib/queries/storage";
import {
  useGadaring,
  useInterestStatus,
  usePingPoints,
  useTickets,
  useToggleInterest,
} from "../../src/lib/queries/gadarings";
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

function BackButton() {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      style={{ top: insets.top + 8 }}
      className="absolute left-4 z-10 h-10 w-10 items-center justify-center rounded-pill bg-black/40"
    >
      <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
    </Pressable>
  );
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  // Resolve the banner R2 key -> signed URL (hook must run before early returns).
  const banner = useResolvedMedia(detail.data?.bannerKey ?? detail.data?.photoKey).data ?? null;

  if (detail.isLoading) {
    return (
      <View className="flex-1 bg-page">
        <BackButton />
        <View className="h-52 w-full bg-hairline" />
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
      <View className="flex-1 bg-page">
        <BackButton />
        <View className="flex-1 justify-center">
          <ErrorState message={`${title}. ${message}`} onRetry={() => detail.refetch()} />
        </View>
      </View>
    );
  }

  const meta = categoryMeta(event.category);
  const live = isLive(event);
  const cancelled = event.status === "CANCELLED";
  const going = goingCount(event);

  return (
    <View className="flex-1 bg-page">
      <BackButton />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={detail.isRefetching} onRefresh={() => detail.refetch()} tintColor={colors.brand} />
        }
      >
        {/* Hero */}
        <View style={{ height: 210, backgroundColor: meta.color }} className="w-full items-center justify-center">
          {banner ? (
            <Image source={banner} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
          ) : (
            <Ionicons name={meta.icon as IoniconName} size={64} color="rgba(255,255,255,0.92)" />
          )}
        </View>

        <View className="gap-3 p-5">
          <View className="flex-row items-center gap-2">
            {live ? (
              <Pill tone="coral" label="Live now" />
            ) : (
              <Pill tone="neutral" label={meta.label} />
            )}
            {event.status === "PUBLISHED" ? <Pill tone="brand" label="Upcoming" /> : null}
            {event.status === "COMPLETED" ? <Pill tone="neutral" label="Ended" /> : null}
            {event.myPurchase ? (
              event.myPurchase.status === "CHECKED_IN" || event.myPurchase.checkedInAt ? (
                <Pill tone="neutral" label="Checked in" />
              ) : (
                <Pill tone="brand" label="You're going" />
              )
            ) : null}
            {isInterested ? <Pill tone="invited" label="Interested" /> : null}
          </View>

          <Text weight="semibold" className="text-2xl">
            {event.name}
          </Text>

          <View className="gap-1.5">
            <InfoRow icon="calendar-outline" text={formatEventRange(event.startDate, event.endDate)} />
            {event.venue ? (
              <InfoRow icon="location-outline" text={event.venue} />
            ) : null}
            <InfoRow icon="people-outline" text={`${going} going`} />
          </View>

          {/* Interest toggle (real GET/POST/DELETE; detail-only per API). */}
          {!cancelled ? (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                toggleInterest.mutate(!isInterested);
              }}
              disabled={interest.isLoading || toggleInterest.isPending}
              accessibilityRole="button"
              accessibilityState={{ selected: isInterested, busy: toggleInterest.isPending }}
              accessibilityLabel={isInterested ? "Remove interest" : "Mark as interested"}
              className={`min-h-[44px] flex-row items-center justify-center gap-2 rounded-btn border px-5 py-3 ${
                isInterested ? "border-invited bg-invited-tint" : "border-hairline-strong bg-surface"
              } ${interest.isLoading || toggleInterest.isPending ? "opacity-60" : ""}`}
            >
              <Ionicons
                name={isInterested ? "heart" : "heart-outline"}
                size={18}
                color={isInterested ? colors.invitedInk : colors.muted}
              />
              <Text weight="semibold" tone={isInterested ? "invited-ink" : "ink"}>
                {isInterested ? "Interested" : "I'm interested"}
              </Text>
            </Pressable>
          ) : null}

          {cancelled ? (
            <View className="rounded-md bg-coral-tint px-4 py-3">
              <Text tone="coral-ink" className="text-sm">
                This event was cancelled.
              </Text>
            </View>
          ) : null}
        </View>

        <SegmentedControl segments={TABS} value={tab} onChange={setTab} />

        <View className="gap-3 p-5">
          {tab === "overview" && <OverviewTab event={event} />}
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
            <MapTab
              event={event}
              loading={pings.isLoading}
              error={pings.isError}
              data={pings.data}
              onRetry={() => pings.refetch()}
            />
          )}
          {tab === "attendees" && <AttendeesTab going={going} />}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, text }: { icon: IoniconName; text: string }) {
  if (!text) return null;
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text tone="muted" className="flex-1 text-sm">
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

function OverviewTab({ event }: { event: Gadaring }) {
  return (
    <View className="gap-3">
      <Text weight="semibold" className="text-lg">
        About
      </Text>
      <Text tone={event.description ? "ink" : "muted"}>
        {event.description?.trim() || "No description yet."}
      </Text>
      {event.gadaringRingId ? (
        <Text tone="faint" className="text-sm">
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
      {/* Interactive map when we have any coordinates; list otherwise. */}
      {mappable ? (
        <VenueMap
          latitude={event.latitude}
          longitude={event.longitude}
          label={event.venue ?? event.name}
          points={points}
        />
      ) : (
        <Text tone="muted">
          No location has been set for this event yet.
        </Text>
      )}

      {/* Ping-point detail list (also the fallback when coordinates are missing). */}
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

function AttendeesTab({ going }: { going: number }) {
  return (
    <View className="gap-2">
      <Text weight="semibold" className="text-3xl">
        {going}
      </Text>
      <Text tone="muted">going to this event.</Text>
      <Text tone="faint" className="text-sm">
        The attendee list is coming soon.
      </Text>
    </View>
  );
}
