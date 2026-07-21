import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState, ErrorState } from "../../src/components/app/states";
import { Avatar, Card, Text } from "../../src/components/ui";
import type { Circle, DirectThread } from "../../src/lib/api/types";
import { threadName, threadPreview } from "../../src/lib/chat-display";
import { useResolvedMedia } from "../../src/lib/queries/storage";
import { useDirectThreads } from "../../src/lib/queries/chat";
import { useCircles } from "../../src/lib/queries/circles";
import { useTheme } from "../../src/theme/ThemeProvider";
import { colors, typography } from "../../src/theme/tokens";

type Row =
  | { type: "header"; key: string; label: string }
  | { type: "dm"; key: string; thread: DirectThread }
  | { type: "circle"; key: string; circle: Circle };

/** Compact thread timestamp: clock time today, else a short date. */
function shortTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }
  return d.toLocaleDateString("en", { day: "numeric", month: "short" });
}

export default function Messages() {
  const theme = useTheme();
  const dark = theme.mode === "dark";
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

  const textPrimary = dark ? { color: theme.text.primary } : undefined;
  const textSecondary = dark ? { color: theme.text.secondary } : undefined;

  return (
    <SafeAreaView
      edges={["top"]}
      className={dark ? "flex-1" : "flex-1 bg-page"}
      style={dark ? { backgroundColor: theme.background.primary } : undefined}
    >
      <View className="px-5 pb-2 pt-2">
        <Text weight="semibold" className="text-2xl" style={textPrimary}>
          Messages
        </Text>
        <Text tone="muted" className="text-sm" style={textSecondary}>
          Your direct messages and circle chats.
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={dark ? theme.accent.primary : colors.brand} />
        </View>
      ) : error ? (
        <View className="flex-1 justify-center">
          <ErrorState
            message="Couldn't load your conversations."
            onRetry={() => {
              threads.refetch();
              circles.refetch();
            }}
            themed={dark}
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
                <Text weight="semibold" tone="muted" className="pb-2 pt-3 text-sm" style={textSecondary}>
                  {item.label}
                </Text>
              );
            }
            if (item.type === "dm") {
              const t = item.thread;
              return (
                <ThreadRow
                  dark={dark}
                  avatarRef={t.avatarUrl}
                  fallbackIcon="person-circle-outline"
                  name={threadName(t)}
                  preview={threadPreview(t)}
                  timeIso={t.lastMessageAt}
                  unread={t.unreadCount}
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
                dark={dark}
                avatarRef={c.photoKey}
                fallbackIcon="people-outline"
                name={c.name}
                preview={typeof c.memberCount === "number" ? `${c.memberCount} members` : undefined}
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
              themed={dark}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function ThreadRow({
  dark,
  avatarRef,
  fallbackIcon,
  name,
  preview,
  timeIso,
  unread,
  onPress,
}: {
  dark: boolean;
  avatarRef?: string | null;
  fallbackIcon: keyof typeof Ionicons.glyphMap;
  name: string;
  preview?: string;
  timeIso?: string;
  unread?: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const resolved = useResolvedMedia(avatarRef).data ?? null;
  const hasUnread = typeof unread === "number" && unread > 0;

  // ── Legacy (light) row — unchanged. ────────────────────────────────────────
  if (!dark) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name} className="mb-3">
        <Card className="flex-row items-center gap-3">
          {resolved ? (
            <Avatar uri={resolved} name={name} size="md" />
          ) : (
            <View className="h-11 w-11 items-center justify-center rounded-pill bg-brand-tint">
              <Ionicons name={fallbackIcon} size={20} color={colors.brandInk} />
            </View>
          )}
          <View className="flex-1">
            <Text weight="medium" numberOfLines={1}>
              {name}
            </Text>
            {preview ? (
              <Text tone="muted" className="text-sm" numberOfLines={1}>
                {preview}
              </Text>
            ) : null}
          </View>
          {timeIso ? (
            <Text tone="faint" className="text-xs">
              {shortTime(timeIso)}
            </Text>
          ) : null}
          {hasUnread ? (
            <View className="min-w-[20px] items-center justify-center rounded-pill bg-brand px-1.5 py-0.5">
              <Text tone="surface" weight="semibold" className="text-xs">
                {unread}
              </Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          )}
        </Card>
      </Pressable>
    );
  }

  // ── Themed (dark) row. ─────────────────────────────────────────────────────
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name} style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
        {resolved ? (
          <Avatar uri={resolved} name={name} size="md" />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 9999, alignItems: "center", justifyContent: "center", backgroundColor: theme.background.surfaceElevated }}>
            <Ionicons name={fallbackIcon} size={20} color={theme.text.secondary} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={{ color: theme.text.primary, fontFamily: typography.family.medium, fontSize: typography.size.base }}>
            {name}
          </Text>
          {preview ? (
            <Text numberOfLines={1} style={{ color: hasUnread ? theme.text.secondary : theme.text.tertiary, fontSize: typography.size.sm }}>
              {preview}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {timeIso ? (
            <Text style={{ color: theme.text.tertiary, fontSize: typography.size.xs }}>{shortTime(timeIso)}</Text>
          ) : null}
          {hasUnread ? (
            <View style={{ minWidth: 20, alignItems: "center", justifyContent: "center", borderRadius: 9999, backgroundColor: theme.accent.primary, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ color: "#FFFFFF", fontFamily: typography.family.semibold, fontSize: typography.size.xs }}>{unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
