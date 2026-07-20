import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Logo, SearchInput, Text } from "../../src/components/ui";
import { CategoryChips } from "../../src/components/app/CategoryChips";
import { EventCard } from "../../src/components/app/EventCard";
import {
  DEFAULT_FILTERS,
  FiltersSheet,
  isFiltered,
  type DatePreset,
  type DiscoverFilterState,
} from "../../src/components/app/FiltersSheet";
import { TrendingCarousel } from "../../src/components/app/TrendingCarousel";
import { EmptyState, ErrorState, SkeletonList } from "../../src/components/app/states";
import type { Category, Gadaring } from "../../src/lib/api/types";
import { useAuth } from "../../src/lib/auth/AuthContext";
import { canConvene } from "../../src/lib/capabilities";
import { useDeviceLocation } from "../../src/lib/location";
import { useDebouncedValue } from "../../src/lib/useDebouncedValue";
import { useDiscover, useTrending } from "../../src/lib/queries/gadarings";
import { useTheme } from "../../src/theme/ThemeProvider";
import { colors } from "../../src/theme/tokens";

function dateRange(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  if (preset === "any") return {};
  const now = new Date();
  let end = new Date(now);
  if (preset === "today") {
    end.setHours(23, 59, 59, 999);
  } else if (preset === "week") {
    end.setDate(now.getDate() + 7);
  } else {
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  return { dateFrom: now.toISOString(), dateTo: end.toISOString() };
}

export default function Discover() {
  const theme = useTheme();
  const dark = theme.mode === "dark";
  const { user } = useAuth();
  const { coords, usingFallback, fallbackLabel, requestAgain } = useDeviceLocation();

  const [category, setCategory] = useState<Category | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<DiscoverFilterState>(DEFAULT_FILTERS);
  const search = useDebouncedValue(searchInput.trim(), 400);

  const filtersRef = useRef<BottomSheetModal>(null);

  const greetingName =
    user?.displayName ?? user?.name ?? user?.email?.split("@")[0] ?? "there";

  // Build the server filters (search is not a server param — filtered client-side below).
  const queryInput = useMemo(
    () => ({
      category,
      lat: coords.lat,
      lng: coords.lng,
      radius: filters.radius,
      isFree: filters.isFree,
      volunteerEnabled: filters.volunteerEnabled || undefined,
      ...dateRange(filters.datePreset),
    }),
    [category, coords.lat, coords.lng, filters],
  );

  const discover = useDiscover(queryInput);
  const trending = useTrending({
    category,
    lat: coords.lat,
    lng: coords.lng,
    radius: filters.radius,
  });

  const allItems = useMemo<Gadaring[]>(
    () => discover.data?.pages.flatMap((p) => p.items) ?? [],
    [discover.data],
  );

  // Client-side search over loaded items (the list endpoint has no text-search param).
  const items = useMemo(() => {
    if (!search) return allItems;
    const q = search.toLowerCase();
    return allItems.filter((e) => {
      const haystack = [e.name, e.venue]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allItems, search]);

  const showInitialLoading = discover.isLoading;
  const showError = discover.isError && allItems.length === 0;

  const header = (
    <View className="gap-5 pb-4">
      <View className="flex-row items-center justify-between pt-1">
        <Logo height={30} />
        {canConvene(user) ? (
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
        ) : (
          <Text tone="muted" className="text-sm" style={dark ? { color: theme.text.secondary } : undefined}>
            Discover
          </Text>
        )}
      </View>

      <View className="gap-0.5">
        <Text weight="semibold" className="text-2xl" style={dark ? { color: theme.text.primary } : undefined}>
          Hi {greetingName} 👋
        </Text>
        <Pressable
          onPress={usingFallback ? requestAgain : undefined}
          accessibilityRole={usingFallback ? "button" : undefined}
          className="flex-row items-center gap-1"
        >
          <Ionicons name="location-outline" size={14} color={dark ? theme.text.secondary : colors.muted} />
          <Text tone="muted" className="text-sm" style={dark ? { color: theme.text.secondary } : undefined}>
            {usingFallback ? `Showing events near ${fallbackLabel}` : "Events near you"}
          </Text>
          {usingFallback ? (
            <Text tone="brand-ink" weight="medium" className="text-sm" style={dark ? { color: theme.accent.primary } : undefined}>
              {"  "}Enable location
            </Text>
          ) : null}
        </Pressable>
      </View>

      {/* Search + filters — visual swap to the themed SearchInput; state wiring
          (searchInput / filters sheet) is unchanged. */}
      <SearchInput
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder="Search events, people or vendors..."
        onFilterPress={() => filtersRef.current?.present()}
        filterActive={isFiltered(filters)}
      />

      <CategoryChips value={category} onChange={setCategory} />

      <TrendingCarousel
        events={trending.data ?? []}
        loading={trending.isLoading}
        themed={dark}
      />

      <Text weight="semibold" className="text-lg" style={dark ? { color: theme.text.primary } : undefined}>
        {search ? "Search results" : "Near you"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1" style={{ backgroundColor: theme.background.primary }}>
      <View className="flex-1 px-5">
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} themed={dark} />}
          ItemSeparatorComponent={() => <View className="h-4" />}
          ListHeaderComponent={header}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
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
            ) : (
              <EmptyState
                title={search ? "No matches" : "No events found"}
                message={
                  search
                    ? "No loaded events match your search. Try a different term."
                    : "Try a different category, widen the distance, or check back soon."
                }
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
      </View>

      <FiltersSheet ref={filtersRef} value={filters} onApply={(next) => {
        setFilters(next);
        filtersRef.current?.dismiss();
      }} />
    </SafeAreaView>
  );
}
