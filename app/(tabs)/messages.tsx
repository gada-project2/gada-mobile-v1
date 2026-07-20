import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState, ErrorState } from "../../src/components/app/states";
import { Card, Text } from "../../src/components/ui";
import type { Circle, DirectThread } from "../../src/lib/api/types";
import { threadName } from "../../src/lib/chat-display";
import { useDirectThreads } from "../../src/lib/queries/chat";
import { useCircles } from "../../src/lib/queries/circles";
import { colors } from "../../src/theme/tokens";

type Row =
  | { type: "header"; key: string; label: string }
  | { type: "dm"; key: string; thread: DirectThread }
  | { type: "circle"; key: string; circle: Circle };

export default function Messages() {
  const threads = useDirectThreads();
  const circles = useCircles();

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const dms = threads.data ?? [];
    const cs = circles.data ?? [];
    if (dms.length > 0) {
      out.push({ type: "header", key: "h-dm", label: "Direct messages" });
      for (const t of dms) out.push({ type: "dm", key: `dm-${t.userId}`, thread: t });
    }
    if (cs.length > 0) {
      out.push({ type: "header", key: "h-circle", label: "Circles" });
      for (const c of cs) out.push({ type: "circle", key: `c-${c.id}`, circle: c });
    }
    return out;
  }, [threads.data, circles.data]);

  const loading = threads.isLoading || circles.isLoading;
  const error = threads.isError && circles.isError;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <View className="px-5 pb-2 pt-2">
        <Text weight="semibold" className="text-2xl">
          Messages
        </Text>
        <Text tone="muted" className="text-sm">
          Read-only history and polls — sending arrives with real-time chat.
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : error ? (
        <View className="flex-1 justify-center">
          <ErrorState
            message="Couldn't load your conversations."
            onRetry={() => {
              threads.refetch();
              circles.refetch();
            }}
          />
        </View>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <Text weight="semibold" tone="muted" className="pb-2 pt-3 text-sm">
                  {item.label}
                </Text>
              );
            }
            if (item.type === "dm") {
              const t = item.thread;
              return (
                <ThreadRow
                  icon="person-circle-outline"
                  title={threadName(t)}
                  subtitle={t.lastMessage}
                  onPress={() =>
                    router.push({
                      pathname: "/chat/[kind]/[id]",
                      params: { kind: "direct", id: t.userId, title: threadName(t) },
                    })
                  }
                />
              );
            }
            const c = item.circle;
            return (
              <ThreadRow
                icon="people-outline"
                title={c.name}
                subtitle={typeof c.memberCount === "number" ? `${c.memberCount} members` : undefined}
                onPress={() =>
                  router.push({
                    pathname: "/chat/[kind]/[id]",
                    params: { kind: "circle", id: c.id, title: c.name },
                  })
                }
              />
            );
          }}
          ListEmptyComponent={
            <EmptyState
              title="No conversations yet"
              message="Your direct messages and circle chats will show up here."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function ThreadRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} className="mb-3">
      <Card className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-pill bg-brand-tint">
          <Ionicons name={icon} size={20} color={colors.brandInk} />
        </View>
        <View className="flex-1">
          <Text weight="medium" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text tone="muted" className="text-sm" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Card>
    </Pressable>
  );
}
