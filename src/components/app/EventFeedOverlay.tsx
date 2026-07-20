import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Category, Gadaring } from "../../lib/api/types";
import { useDeviceLocation } from "../../lib/location";
import { useDiscover } from "../../lib/queries/gadarings";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { colors } from "../../theme/tokens";
import { Text } from "../ui";
import { CategoryChips } from "./CategoryChips";
import { EventCard } from "./EventCard";
import { EmptyState, ErrorState, SkeletonList } from "./states";

// Calm panel spring, matching the calendar overlay.
const SPRING = { damping: 24, stiffness: 240, mass: 1 };
const RUBBER = 0.2;
const VELOCITY_THRESHOLD = 500;

/**
 * Bottom-swipe event feed: swipe up from the home hub to raise the feed sheet
 * over the home view. Mirrors CalendarOverlay's patterns. Two resting states —
 * peek and open — plus closed. `ty` is the sheet's translateY: 0 = open,
 * PEEK_T = peek, CLOSED_T = hidden below the screen.
 *
 * Coexists with the right-edge calendar gesture: this activates on the VERTICAL
 * axis from the BOTTOM edge, the calendar on the HORIZONTAL axis from the RIGHT
 * edge, so their activation offsets keep them from stealing each other.
 */
export function EventFeedOverlay() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const OPEN_Y = insets.top + 52;
  const PEEK_Y = height * 0.52;
  const CLOSED_T = height - OPEN_Y; // translateY that hides the sheet
  const PEEK_T = PEEK_Y - OPEN_Y;
  const SNAP = [0, PEEK_T, CLOSED_T];

  const ty = useSharedValue(CLOSED_T);
  const prevT = useSharedValue(0);
  const [visible, setVisible] = useState(false);

  useAnimatedReaction(
    () => ty.value < CLOSED_T - 0.5,
    (now, prev) => {
      if (now !== prev) scheduleOnRN(setVisible, now);
    },
  );

  const afterSnap = (target: number) => {
    Haptics.impactAsync(
      target === 0 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
  };

  const animateTo = (target: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    ty.value = reduced ? withTiming(target, { duration: 220 }) : withSpring(target, SPRING);
  };

  // --- shared drag worklets ---
  const onDragBegin = () => {
    "worklet";
    cancelAnimation(ty);
    prevT.value = 0;
  };
  // gated=true (list): only move the sheet when it isn't fully open, so at full
  // open the list owns scroll + pull-to-refresh. gated=false (handle): always.
  const onDragChange = (translationY: number, gated: boolean) => {
    "worklet";
    const dy = translationY - prevT.value;
    prevT.value = translationY;
    if (gated && ty.value <= 0.5) return;
    let v = ty.value + dy;
    if (v < 0) v = v * RUBBER;
    else if (v > CLOSED_T) v = CLOSED_T + (v - CLOSED_T) * RUBBER;
    ty.value = v;
  };
  const onDragEnd = (velocityY: number) => {
    "worklet";
    let target: number;
    if (velocityY < -VELOCITY_THRESHOLD) {
      target = ty.value > PEEK_T ? PEEK_T : 0; // fast up -> next higher
    } else if (velocityY > VELOCITY_THRESHOLD) {
      target = ty.value < PEEK_T ? PEEK_T : CLOSED_T; // fast down -> next lower
    } else {
      target = SNAP.reduce((a, b) => (Math.abs(b - ty.value) < Math.abs(a - ty.value) ? b : a), SNAP[0]);
    }
    ty.value = withSpring(target, { ...SPRING, velocity: velocityY });
    scheduleOnRN(afterSnap, target);
  };

  // The scroll cooperates with the sheet drag (standard bottom-sheet handling).
  const nativeGesture = Gesture.Native();
  const listPan = Gesture.Pan()
    .enabled(!reduced)
    .activeOffsetY([-12, 12])
    .simultaneousWithExternalGesture(nativeGesture)
    .onBegin(onDragBegin)
    .onUpdate((e) => onDragChange(e.translationY, true))
    .onEnd((e) => onDragEnd(e.velocityY));

  const handlePan = Gesture.Pan()
    .enabled(!reduced)
    .activeOffsetY([-12, 12])
    .onBegin(onDragBegin)
    .onUpdate((e) => onDragChange(e.translationY, false))
    .onEnd((e) => onDragEnd(e.velocityY));

  // Open: upward drag from the bottom edge strip.
  const openPan = Gesture.Pan()
    .enabled(!reduced)
    .activeOffsetY([-12, 12])
    .onBegin(onDragBegin)
    .onUpdate((e) => onDragChange(e.translationY, false))
    .onEnd((e) => onDragEnd(e.velocityY));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ty.value, [0, CLOSED_T], [0.5, 0], "clamp"),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
  }));
  const bottomHandleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ty.value, [PEEK_T, CLOSED_T], [0, 1], "clamp"),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Scrim over the home behind the sheet */}
      {visible ? (
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss event feed"
          onPress={() => animateTo(CLOSED_T)}
          style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }, scrimStyle]}
        />
      ) : null}

      {/* The sheet */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: OPEN_Y,
            left: 0,
            right: 0,
            height: CLOSED_T,
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 16,
          },
          sheetStyle,
        ]}
      >
        {/* Grab area: handle + search + chips (always drags the sheet) */}
        <GestureDetector gesture={handlePan}>
          <View className="px-5 pt-3">
            <View className="mb-3 items-center">
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.hairlineStrong }} />
            </View>
            <Text weight="semibold" className="pb-1 text-xl">
              Events near you
            </Text>
          </View>
        </GestureDetector>

        {/* Feed list: scroll + drag cooperate */}
        {visible ? (
          <FeedList
            listPan={listPan}
            nativeGesture={nativeGesture}
            paddingBottom={insets.bottom + 16}
          />
        ) : (
          <View className="flex-1" />
        )}
      </Animated.View>

      {/* Bottom-edge open handle (open affordance + reduced-motion entry) */}
      <GestureDetector gesture={openPan}>
        <Animated.View
          pointerEvents={visible ? "none" : "auto"}
          style={[
            { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingBottom: insets.bottom + 6 },
            bottomHandleStyle,
          ]}
        >
          <Pressable
            onPress={() => animateTo(reduced ? 0 : PEEK_T)}
            accessibilityRole="button"
            accessibilityLabel="Open event feed"
            hitSlop={8}
            className="flex-row items-center gap-1.5 rounded-pill bg-surface px-4 py-2"
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 6,
            }}
          >
            <Ionicons name="chevron-up" size={16} color={colors.brandInk} />
            <Text weight="semibold" tone="brand-ink" className="text-sm">
              Events near you
            </Text>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function FeedList({
  listPan,
  nativeGesture,
  paddingBottom,
}: {
  listPan: ReturnType<typeof Gesture.Pan>;
  nativeGesture: ReturnType<typeof Gesture.Native>;
  paddingBottom: number;
}) {
  const { coords } = useDeviceLocation();
  const [category, setCategory] = useState<Category | undefined>();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 400);

  const discover = useDiscover({
    category,
    lat: coords.lat,
    lng: coords.lng,
    radius: 50,
  });

  const allItems = useMemo<Gadaring[]>(
    () => discover.data?.pages.flatMap((p) => p.items) ?? [],
    [discover.data],
  );
  const items = useMemo(() => {
    if (!search) return allItems;
    const q = search.toLowerCase();
    return allItems.filter((e) =>
      [e.name, e.venue].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [allItems, search]);

  const showError = discover.isError && allItems.length === 0;

  return (
    <View className="flex-1">
      {/* Search + chips (part of the sheet header, above the list) */}
      <View className="gap-3 px-5 pb-3">
        <View className="h-11 flex-row items-center gap-2 rounded-md border border-hairline-strong bg-surface px-3">
          <Ionicons name="search" size={18} color={colors.faint} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search events"
            placeholderTextColor={colors.faint}
            returnKeyType="search"
            className="h-full flex-1 font-sans text-base text-ink"
          />
          {searchInput.length > 0 ? (
            <Pressable onPress={() => setSearchInput("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.faint} />
            </Pressable>
          ) : null}
        </View>
        <CategoryChips value={category} onChange={setCategory} />
      </View>

      <GestureDetector gesture={listPan}>
        <View className="flex-1">
          {discover.isLoading ? (
            <View className="px-5">
              <SkeletonList />
            </View>
          ) : showError ? (
            <ErrorState onRetry={() => discover.refetch()} />
          ) : (
            <GestureDetector gesture={nativeGesture}>
            <FlashList
              data={items}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View className="px-5">
                  <EventCard event={item} />
                </View>
              )}
              ItemSeparatorComponent={() => <View className="h-4" />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 4, paddingBottom }}
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
                  tintColor={colors.brand}
                />
              }
              ListEmptyComponent={
                <EmptyState
                  title={search ? "No matches" : "No events found"}
                  message={
                    search
                      ? "No loaded events match your search."
                      : "Try a different category or widen the distance."
                  }
                />
              }
              ListFooterComponent={
                discover.isFetchingNextPage ? (
                  <View className="py-6">
                    <ActivityIndicator color={colors.brand} />
                  </View>
                ) : null
              }
            />
            </GestureDetector>
          )}
        </View>
      </GestureDetector>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
