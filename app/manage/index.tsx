import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState, ErrorState } from "../../src/components/app/states";
import { HostingDisabled } from "../../src/components/app/HostingDisabled";
import { Card, Pill, Text } from "../../src/components/ui";
import type { Gadaring } from "../../src/lib/api/types";
import { useAuth } from "../../src/lib/auth/AuthContext";
import { canConvene } from "../../src/lib/capabilities";
import { formatEventDate } from "../../src/lib/dates";
import { useMyGadarings } from "../../src/lib/queries/manage";
import { adminPill, statusPill } from "../../src/lib/status-display";
import { colors } from "../../src/theme/tokens";

const GROUPS = [
  { key: "DRAFT", title: "Draft" },
  { key: "PUBLISHED", title: "Upcoming" },
  { key: "ONGOING", title: "Live now" },
  { key: "COMPLETED", title: "Past" },
  { key: "CANCELLED", title: "Cancelled" },
];

type Row = { type: "header"; title: string } | { type: "event"; event: Gadaring };

function ManageEventRow({ event }: { event: Gadaring }) {
  const s = statusPill(event.status);
  const admin = adminPill(event.adminStatus);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/manage/[id]", params: { id: event.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Manage ${event.name}`}
    >
      <Card className="gap-2">
        <View className="flex-row items-start justify-between gap-3">
          <Text weight="semibold" className="flex-1 text-base" numberOfLines={2}>
            {event.name}
          </Text>
          <Pill tone={s.tone} label={s.label} />
        </View>
        <Text tone="muted" className="text-sm">
          {formatEventDate(event.startDate)}
        </Text>
        {admin ? <Pill tone={admin.tone} label={admin.label} /> : null}
      </Card>
    </Pressable>
  );
}

export default function MyEvents() {
  const { user } = useAuth();
  const query = useMyGadarings({ perPage: 100 });
  const items = query.data?.items ?? [];

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const g of GROUPS) {
      const evts = items.filter((e) => e.status === g.key);
      if (!evts.length) continue;
      out.push({ type: "header", title: g.title });
      for (const e of evts) out.push({ type: "event", event: e });
    }
    return out;
  }, [items]);

  if (!canConvene(user)) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-page">
        <HostingDisabled onBack={() => router.replace("/(tabs)")} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
        <Text weight="semibold" className="text-2xl">
          My events
        </Text>
        <Pressable
          onPress={() => router.push("/create")}
          accessibilityRole="button"
          accessibilityLabel="Host a gadaring"
          className="min-h-[40px] flex-row items-center gap-1.5 rounded-pill bg-brand px-4"
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text weight="semibold" tone="surface" className="text-sm">
            Host
          </Text>
        </Pressable>
      </View>

      <View className="flex-1 px-5">
        <FlashList
          data={rows}
          keyExtractor={(item, i) => (item.type === "header" ? `h-${item.title}` : item.event.id) + i}
          getItemType={(item) => item.type}
          renderItem={({ item }) =>
            item.type === "header" ? (
              <Text weight="semibold" tone="muted" className="pb-2 pt-4 text-sm uppercase">
                {item.title}
              </Text>
            ) : (
              <View className="pb-3">
                <ManageEventRow event={item.event} />
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            query.isLoading ? (
              <View className="gap-3 pt-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="gap-2">
                    <View className="h-4 w-2/3 rounded bg-hairline" />
                    <View className="h-3 w-1/3 rounded bg-hairline" />
                  </Card>
                ))}
              </View>
            ) : query.isError ? (
              <ErrorState message="Couldn't load your events." onRetry={() => query.refetch()} />
            ) : (
              <EmptyState
                title="No events yet"
                message="Tap Host to create your first gadaring."
              />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}
