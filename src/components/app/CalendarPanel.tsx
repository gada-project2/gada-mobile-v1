import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import type { Gadaring } from "../../lib/api/types";
import {
  dayKey,
  isSameDay,
  isSameMonth,
  monthGrid,
  step,
  viewTitle,
  visibleRange,
  WEEKDAY_LABELS,
  weekDays,
  type CalendarView,
} from "../../lib/calendar";
import { formatEventDate } from "../../lib/dates";
import {
  useCalendarEvents,
  useEventRelationships,
  type EventRelationship,
} from "../../lib/queries/calendar";
import { colors } from "../../theme/tokens";
import { Text } from "../ui";
import { SegmentedControl, type Segment } from "./SegmentedControl";

const VIEWS: Segment<CalendarView>[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
];

// Relationship colours (CLAUDE.md tokens). Interested/invited intentionally
// absent — no API state for them (see useEventRelationships TODO).
const REL_COLOR: Record<EventRelationship, string> = {
  attending: colors.attending,
  volunteering: colors.volunteering,
  neutral: colors.faint,
};

export function CalendarPanel({
  visible,
  paddingTop,
  paddingBottom,
  onClose,
}: {
  visible: boolean;
  paddingTop: number;
  paddingBottom: number;
  onClose: () => void;
}) {
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());

  const range = useMemo(() => visibleRange(view, anchor), [view, anchor]);
  const events = useCalendarEvents(range, visible);
  const { relationshipOf } = useEventRelationships(visible);

  // Bucket events by local day.
  const byDay = useMemo(() => {
    const map = new Map<string, Gadaring[]>();
    for (const e of events.data ?? []) {
      const d = e.startDate ? new Date(e.startDate) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const k = dayKey(d);
      const arr = map.get(k);
      if (arr) arr.push(e);
      else map.set(k, [e]);
    }
    return map;
  }, [events.data]);

  const selectedEvents = byDay.get(dayKey(selected)) ?? [];

  const go = (dir: 1 | -1) => {
    const next = step(view, anchor, dir);
    setAnchor(next);
    if (view === "day") setSelected(next);
  };
  const goToday = () => {
    const now = new Date();
    setAnchor(now);
    setSelected(now);
  };
  const pickDay = (d: Date) => {
    setSelected(d);
    if (!isSameMonth(d, anchor)) setAnchor(d);
  };
  const openEvent = (e: Gadaring) => {
    onClose();
    router.push({ pathname: "/events/[id]", params: { id: e.id } });
  };

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-2">
        <Text weight="semibold" className="text-xl">
          {viewTitle(view, view === "day" ? selected : anchor)}
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close calendar"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-pill bg-page"
        >
          <Ionicons name="close" size={20} color={colors.ink} />
        </Pressable>
      </View>

      {/* Nav row */}
      <View className="flex-row items-center justify-between px-4 pb-2">
        <Pressable onPress={() => go(-1)} accessibilityRole="button" accessibilityLabel="Previous" hitSlop={8} className="h-10 w-10 items-center justify-center rounded-pill bg-page">
          <Ionicons name="chevron-back" size={18} color={colors.ink} />
        </Pressable>
        <Pressable onPress={goToday} accessibilityRole="button" accessibilityLabel="Today" className="rounded-pill bg-brand-tint px-4 py-2">
          <Text weight="medium" tone="brand-ink" className="text-sm">
            Today
          </Text>
        </Pressable>
        <Pressable onPress={() => go(1)} accessibilityRole="button" accessibilityLabel="Next" hitSlop={8} className="h-10 w-10 items-center justify-center rounded-pill bg-page">
          <Ionicons name="chevron-forward" size={18} color={colors.ink} />
        </Pressable>
      </View>

      <View className="px-4">
        <SegmentedControl segments={VIEWS} value={view} onChange={setView} />
      </View>

      {/* Legend */}
      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
        <LegendDot color={REL_COLOR.attending} label="Attending" />
        <LegendDot color={REL_COLOR.volunteering} label="Volunteering" />
        <LegendDot color={REL_COLOR.neutral} label="Other" />
      </View>

      {/* Grid / week selector */}
      {view === "month" ? (
        <MonthGrid anchor={anchor} selected={selected} byDay={byDay} relationshipOf={relationshipOf} onPick={pickDay} />
      ) : view === "week" ? (
        <WeekStrip anchor={anchor} selected={selected} byDay={byDay} relationshipOf={relationshipOf} onPick={setSelected} />
      ) : null}

      {/* Selected-day event list */}
      <View className="flex-1 px-4 pt-1">
        {view !== "day" ? (
          <Text tone="muted" weight="medium" className="pb-2 text-sm">
            {formatEventDate(selected.toISOString()).split(" · ")[0]}
          </Text>
        ) : null}
        {events.isLoading ? (
          <View className="py-10">
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : selectedEvents.length === 0 ? (
          <Text tone="faint" className="py-6 text-sm">
            No events on this day.
          </Text>
        ) : (
          <FlashList
            data={selectedEvents}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ paddingBottom }}
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={({ item }) => (
              <EventRow event={item} rel={relationshipOf(item.id)} onPress={() => openEvent(item)} />
            )}
          />
        )}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text tone="muted" className="text-xs">
        {label}
      </Text>
    </View>
  );
}

function MonthGrid({
  anchor,
  selected,
  byDay,
  relationshipOf,
  onPick,
}: {
  anchor: Date;
  selected: Date;
  byDay: Map<string, Gadaring[]>;
  relationshipOf: (id: string) => EventRelationship;
  onPick: (d: Date) => void;
}) {
  const grid = monthGrid(anchor);
  const today = new Date();
  return (
    <View className="px-2">
      <View className="flex-row">
        {WEEKDAY_LABELS.map((w) => (
          <View key={w} className="flex-1 items-center pb-1">
            <Text tone="faint" className="text-xs">
              {w}
            </Text>
          </View>
        ))}
      </View>
      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} className="flex-row">
          {grid.slice(row * 7, row * 7 + 7).map((d) => {
            const inMonth = isSameMonth(d, anchor);
            const isSel = isSameDay(d, selected);
            const isToday = isSameDay(d, today);
            const dayEvents = byDay.get(dayKey(d)) ?? [];
            const dots = dayEvents.slice(0, 3).map((e) => relationshipOf(e.id));
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => onPick(d)}
                accessibilityRole="button"
                accessibilityLabel={`${d.getDate()}, ${dayEvents.length} events`}
                className="flex-1 items-center py-1"
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-pill"
                  style={{ backgroundColor: isSel ? colors.brand : "transparent" }}
                >
                  <Text
                    className="text-sm"
                    weight={isToday ? "semibold" : "regular"}
                    style={{
                      color: isSel ? "#FFFFFF" : inMonth ? (isToday ? colors.brand : colors.ink) : colors.faint,
                    }}
                  >
                    {d.getDate()}
                  </Text>
                </View>
                <View className="h-2 flex-row gap-0.5">
                  {dots.map((rel, i) => (
                    <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isSel ? "#FFFFFF" : REL_COLOR[rel] }} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function WeekStrip({
  anchor,
  selected,
  byDay,
  relationshipOf,
  onPick,
}: {
  anchor: Date;
  selected: Date;
  byDay: Map<string, Gadaring[]>;
  relationshipOf: (id: string) => EventRelationship;
  onPick: (d: Date) => void;
}) {
  const days = weekDays(anchor);
  const today = new Date();
  return (
    <View className="flex-row px-2">
      {days.map((d) => {
        const isSel = isSameDay(d, selected);
        const isToday = isSameDay(d, today);
        const dayEvents = byDay.get(dayKey(d)) ?? [];
        const dots = dayEvents.slice(0, 3).map((e) => relationshipOf(e.id));
        return (
          <Pressable key={d.toISOString()} onPress={() => onPick(d)} className="flex-1 items-center gap-1 py-2">
            <Text tone="faint" className="text-xs">
              {WEEKDAY_LABELS[d.getDay()]}
            </Text>
            <View className="h-9 w-9 items-center justify-center rounded-pill" style={{ backgroundColor: isSel ? colors.brand : "transparent" }}>
              <Text className="text-sm" weight={isToday ? "semibold" : "regular"} style={{ color: isSel ? "#FFFFFF" : isToday ? colors.brand : colors.ink }}>
                {d.getDate()}
              </Text>
            </View>
            <View className="h-2 flex-row gap-0.5">
              {dots.map((rel, i) => (
                <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isSel ? colors.brand : REL_COLOR[rel] }} />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function EventRow({ event, rel, onPress }: { event: Gadaring; rel: EventRelationship; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.name}. ${rel}.`}
      className="flex-row items-center gap-3 rounded-md border border-hairline bg-surface p-3"
    >
      <View style={{ width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: REL_COLOR[rel] }} />
      <View className="flex-1">
        <Text weight="medium" numberOfLines={1}>
          {event.name}
        </Text>
        <Text tone="muted" className="text-sm" numberOfLines={1}>
          {formatEventDate(event.startDate)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.faint} />
    </Pressable>
  );
}
