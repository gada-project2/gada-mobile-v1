import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SegmentedControl, type Segment } from "../../src/components/app/SegmentedControl";
import { EmptyState, ErrorState } from "../../src/components/app/states";
import { Card, Text } from "../../src/components/ui";
import { markAllNotificationsRead, markNotificationRead } from "../../src/lib/api/notifications";
import type { AppNotification } from "../../src/lib/api/types";
import { formatEventDate } from "../../src/lib/dates";
import { isUnread, notificationMeta, notificationText } from "../../src/lib/notification-display";
import { notificationKeys } from "../../src/lib/queries/keys";
import { useNotifications } from "../../src/lib/queries/notifications";
import { colors } from "../../src/theme/tokens";

type Filter = "all" | "unread";
const FILTERS: Segment<Filter>[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

export default function Notifications() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const list = useNotifications(filter === "unread" ? false : undefined);

  const items = useMemo<AppNotification[]>(
    () => list.data?.pages.flatMap((p) => p.items) ?? [],
    [list.data],
  );

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
    ]);

  const onTap = async (n: AppNotification) => {
    Haptics.selectionAsync().catch(() => {});
    if (isUnread(n)) {
      try {
        await markNotificationRead(n.id);
        await invalidate();
      } catch {
        // non-blocking; the row simply stays unread
      }
    }
    if ((n.type ?? "").toUpperCase() === "FIND_ME_REQUEST") router.push("/safety");
  };

  const markAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await markAllNotificationsRead();
      await invalidate();
    } catch {
      // ignore — list will refetch on focus
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-11 w-11 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text weight="semibold" className="flex-1 text-lg">
          Notifications
        </Text>
        <Pressable onPress={markAll} accessibilityRole="button" accessibilityLabel="Mark all read" hitSlop={8} className="pr-2">
          <Text tone="brand-ink" weight="medium" className="text-sm">
            Mark all read
          </Text>
        </Pressable>
      </View>

      <View className="px-5 pb-2">
        <SegmentedControl segments={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {list.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : list.isError ? (
        <View className="flex-1 justify-center">
          <ErrorState message="Couldn't load notifications." onRetry={() => list.refetch()} />
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          renderItem={({ item }) => <NotificationRow n={item} onPress={() => onTap(item)} />}
          ListEmptyComponent={
            <EmptyState
              title={filter === "unread" ? "All caught up" : "No notifications"}
              message={filter === "unread" ? "You have no unread notifications." : "You'll see updates here."}
            />
          }
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator color={colors.brand} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function NotificationRow({ n, onPress }: { n: AppNotification; onPress: () => void }) {
  const meta = notificationMeta(n.type);
  const unread = isUnread(n);
  const text = notificationText(n);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={n.title ?? text}>
      <Card className={`flex-row items-start gap-3 ${unread ? "" : "opacity-70"}`}>
        <View className="h-10 w-10 items-center justify-center rounded-pill" style={{ backgroundColor: `${meta.tint}22` }}>
          <Ionicons name={meta.icon} size={18} color={meta.tint} />
        </View>
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <Text weight={unread ? "semibold" : "medium"} className="flex-1" numberOfLines={1}>
              {n.title ?? "Notification"}
            </Text>
            {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coral }} /> : null}
          </View>
          {text ? (
            <Text tone="muted" className="text-sm" numberOfLines={2}>
              {text}
            </Text>
          ) : null}
          {n.createdAt ? (
            <Text tone="faint" className="text-xs">
              {formatEventDate(n.createdAt)}
            </Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}
