import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SegmentedControl, type Segment } from "../../src/components/app/SegmentedControl";
import { TicketCard } from "../../src/components/app/TicketCard";
import { Card, Text } from "../../src/components/ui";
import { EmptyState, ErrorState } from "../../src/components/app/states";
import type { MyTicketsTab } from "../../src/lib/api/tickets";
import { useMyTickets } from "../../src/lib/queries/tickets";
import { purchaseKey } from "../../src/lib/ticket-display";
import { colors } from "../../src/theme/tokens";

const TABS: Segment<MyTicketsTab>[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

function LoadingCards() {
  return (
    <View className="gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="gap-2">
          <View className="h-4 w-3/4 rounded bg-hairline" />
          <View className="h-3 w-1/2 rounded bg-hairline" />
          <View className="h-3 w-2/5 rounded bg-hairline" />
        </Card>
      ))}
    </View>
  );
}

export default function Tickets() {
  const [tab, setTab] = useState<MyTicketsTab>("upcoming");
  const query = useMyTickets(tab);
  const items = query.data ?? [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
        <Text weight="semibold" className="text-2xl">
          My tickets
        </Text>
        <Pressable
          onPress={() => router.push("/payments/history")}
          accessibilityRole="button"
          accessibilityLabel="Payment history"
          className="min-h-[44px] flex-row items-center gap-1.5"
        >
          <Ionicons name="receipt-outline" size={16} color={colors.brandInk} />
          <Text tone="brand-ink" weight="medium" className="text-sm">
            Payments
          </Text>
        </Pressable>
      </View>

      <View className="px-5">
        <SegmentedControl segments={TABS} value={tab} onChange={setTab} />
      </View>

      <View className="flex-1 px-5 pt-4">
        <FlashList
          data={items}
          keyExtractor={(item) => purchaseKey(item)}
          renderItem={({ item }) => <TicketCard ticket={item} />}
          ItemSeparatorComponent={() => <View className="h-4" />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            query.isLoading ? (
              <LoadingCards />
            ) : query.isError ? (
              <ErrorState message="Couldn't load your tickets." onRetry={() => query.refetch()} />
            ) : (
              <EmptyState
                title={tab === "upcoming" ? "No upcoming tickets" : "No past tickets"}
                message={
                  tab === "upcoming"
                    ? "When you get a ticket, it'll appear here with its QR."
                    : "Tickets for events that have ended will show here."
                }
              />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}
