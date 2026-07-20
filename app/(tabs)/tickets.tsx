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
import { useTheme } from "../../src/theme/ThemeProvider";
import { colors } from "../../src/theme/tokens";

// Only two real, distinct queries exist (GET /tickets?tab=upcoming|past). The
// mockup's Hosting/Attending tabs are NOT backed here — Hosting is a convener
// concept (manage screen, different data source) and "Attending" would just be
// the tickets you already hold. We don't fake tabs onto a single query.
const TABS: Segment<MyTicketsTab>[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

function LoadingCards({ dark }: { dark: boolean }) {
  const theme = useTheme();
  const block = dark ? { backgroundColor: theme.background.surfaceElevated } : undefined;
  return (
    <View className="gap-4">
      {Array.from({ length: 3 }).map((_, i) =>
        dark ? (
          <Card key={i} themed style={{ gap: 8 }}>
            <View className="h-4 w-3/4 rounded" style={block} />
            <View className="h-3 w-1/2 rounded" style={block} />
            <View className="h-3 w-2/5 rounded" style={block} />
          </Card>
        ) : (
          <Card key={i} className="gap-2">
            <View className="h-4 w-3/4 rounded bg-hairline" />
            <View className="h-3 w-1/2 rounded bg-hairline" />
            <View className="h-3 w-2/5 rounded bg-hairline" />
          </Card>
        ),
      )}
    </View>
  );
}

export default function Tickets() {
  const theme = useTheme();
  const dark = theme.mode === "dark";
  const [tab, setTab] = useState<MyTicketsTab>("upcoming");
  const query = useMyTickets(tab);
  const items = query.data ?? [];

  const textPrimary = dark ? { color: theme.text.primary } : undefined;

  return (
    <SafeAreaView
      edges={["top"]}
      className={dark ? "flex-1" : "flex-1 bg-page"}
      style={dark ? { backgroundColor: theme.background.primary } : undefined}
    >
      <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
        <Text weight="semibold" className="text-2xl" style={textPrimary}>
          My tickets
        </Text>
        <Pressable
          onPress={() => router.push("/payments/history")}
          accessibilityRole="button"
          accessibilityLabel="Payment history"
          className="min-h-[44px] flex-row items-center gap-1.5"
        >
          <Ionicons name="receipt-outline" size={16} color={dark ? theme.accent.primary : colors.brandInk} />
          <Text tone="brand-ink" weight="medium" className="text-sm" style={dark ? { color: theme.accent.primary } : undefined}>
            Payments
          </Text>
        </Pressable>
      </View>

      <View className="px-5">
        <SegmentedControl segments={TABS} value={tab} onChange={setTab} dark={dark} />
      </View>

      <View className="flex-1 px-5 pt-4">
        <FlashList
          data={items}
          keyExtractor={(item) => purchaseKey(item)}
          renderItem={({ item }) => <TicketCard ticket={item} themed={dark} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor={dark ? theme.accent.primary : colors.brand}
            />
          }
          ListEmptyComponent={
            query.isLoading ? (
              <LoadingCards dark={dark} />
            ) : query.isError ? (
              <ErrorState message="Couldn't load your tickets." onRetry={() => query.refetch()} themed={dark} />
            ) : (
              <EmptyState
                title={tab === "upcoming" ? "No upcoming tickets" : "No past tickets"}
                message={
                  tab === "upcoming"
                    ? "When you get a ticket, it'll appear here with its QR."
                    : "Tickets for events that have ended will show here."
                }
                themed={dark}
              />
            )
          }
        />
      </View>
    </SafeAreaView>
  );
}
