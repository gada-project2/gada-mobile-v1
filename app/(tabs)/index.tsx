import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EventCard } from "../../src/components/app/EventCard";
import { NotificationBell } from "../../src/components/app/NotificationBell";
import { EmptyState, ErrorState, SkeletonList } from "../../src/components/app/states";
import { Avatar, Chip, Text } from "../../src/components/ui";
import type { Category, Gadaring } from "../../src/lib/api/types";
import { useAuth } from "../../src/lib/auth/AuthContext";
import { CATEGORY_LIST } from "../../src/lib/categories";
import { useDeviceLocation } from "../../src/lib/location";
import { useDiscover, useTrending } from "../../src/lib/queries/gadarings";
import { useResolvedMedia } from "../../src/lib/queries/storage";
import { useTheme } from "../../src/theme/ThemeProvider";
import { colors } from "../../src/theme/tokens";

/**
 * Home — the primary event-discovery feed (dark-theme mockup): location-picker
 * header, icon-in-circle category row, a "Hot this week" hero card and a
 * two-column "Trending events" grid. Replaces the earlier sphere menu (product
 * decision, Stage C1). Create is reached via the tab-bar FAB; the calendar via
 * the swipe-in overlay.
 */
export default function Home() {
  const theme = useTheme();
  const dark = theme.mode === "dark";
  const { user } = useAuth();
  const { coords, usingFallback, fallbackLabel, requestAgain } = useDeviceLocation();

  const [category, setCategory] = useState<Category | undefined>();

  const greetingName = user?.displayName ?? user?.name ?? user?.email?.split("@")[0] ?? "there";
  const avatarUrl = useResolvedMedia(user?.photoKey).data ?? null;

  const queryInput = useMemo(
    () => ({ category, lat: coords.lat, lng: coords.lng }),
    [category, coords.lat, coords.lng],
  );

  const discover = useDiscover(queryInput);
  const trending = useTrending(queryInput);

  const items = useMemo<Gadaring[]>(
    () => discover.data?.pages.flatMap((p) => p.items) ?? [],
    [discover.data],
  );

  // Hero = the top trending event (fall back to the first near-you item).
  const hero = trending.data?.[0] ?? items[0] ?? null;
  const grid = useMemo(() => items.filter((e) => e.id !== hero?.id), [items, hero?.id]);

  const showInitialLoading = discover.isLoading;
  const showError = discover.isError && items.length === 0;

  const locationLabel = usingFallback ? fallbackLabel : "Events near you";

  const textPrimary = dark ? { color: theme.text.primary } : undefined;

  const listHeader = (
    <View style={{ gap: 20, paddingBottom: 8, paddingHorizontal: 6 }}>
      {/* Category row — icon-in-circle chips (Ionicons per category). */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {CATEGORY_LIST.map((c) => {
          const active = category === c.key;
          return (
            <Chip
              key={c.key}
              variant="category"
              label={c.label}
              selected={active}
              circleColor={c.color}
              icon={<Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={13} color="#FFFFFF" />}
              onPress={() => setCategory(active ? undefined : c.key)}
            />
          );
        })}
      </ScrollView>

      {/* Hot this week hero. */}
      {hero ? (
        <View style={{ gap: 12 }}>
          <Text weight="semibold" className="text-lg" style={textPrimary}>
            Hot this week
          </Text>
          <EventCard event={hero} variant="hero" themed={dark} />
        </View>
      ) : null}

      {grid.length > 0 ? (
        <Text weight="semibold" className="text-lg" style={textPrimary}>
          Trending events
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1" style={{ backgroundColor: theme.background.primary }}>
      {/* Fixed app header: location picker · bell · avatar. */}
      <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
        <Pressable
          onPress={usingFallback ? requestAgain : undefined}
          accessibilityRole={usingFallback ? "button" : undefined}
          accessibilityLabel="Location"
          className="flex-row items-center gap-1"
        >
          <Ionicons name="location" size={16} color={theme.accent.primary} />
          <Text weight="semibold" className="text-base" style={textPrimary} numberOfLines={1}>
            {locationLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={dark ? theme.text.secondary : colors.muted} />
        </Pressable>

        <View className="flex-row items-center gap-3">
          <NotificationBell />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            hitSlop={8}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Avatar uri={avatarUrl} name={greetingName} size="md" />
          </Pressable>
        </View>
      </View>

      <FlashList
        data={grid}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ flex: 1, paddingHorizontal: 6, paddingBottom: 12 }}>
            <EventCard event={item} variant="compact" themed={dark} />
          </View>
        )}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 32 }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (discover.hasNextPage && !discover.isFetchingNextPage) {
            void discover.fetchNextPage();
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={discover.isRefetching && !discover.isFetchingNextPage}
            onRefresh={() => discover.refetch()}
            tintColor={dark ? theme.accent.primary : colors.brand}
          />
        }
        ListEmptyComponent={
          showInitialLoading ? (
            <SkeletonList themed={dark} />
          ) : showError ? (
            <ErrorState onRetry={() => discover.refetch()} themed={dark} />
          ) : hero ? (
            // A hero is showing, so the feed isn't truly empty — no empty state.
            null
          ) : (
            <EmptyState
              title="No events found"
              message="Try a different category, or check back soon."
              themed={dark}
            />
          )
        }
        ListFooterComponent={
          discover.isFetchingNextPage ? (
            <View className="py-6">
              <ActivityIndicator color={dark ? theme.accent.primary : colors.brand} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
