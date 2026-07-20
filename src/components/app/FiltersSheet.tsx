import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "../../lib/cn";
import { colors } from "../../theme/tokens";
import { Button, Text } from "../ui";

export type DatePreset = "any" | "today" | "week" | "month";

export interface DiscoverFilterState {
  radius: number; // km
  isFree?: boolean; // true = free, false = paid, undefined = any
  volunteerEnabled: boolean;
  datePreset: DatePreset;
}

export const DEFAULT_FILTERS: DiscoverFilterState = {
  radius: 50,
  isFree: undefined,
  volunteerEnabled: false,
  datePreset: "any",
};

/** True when the filters differ from defaults (used to badge the Filters button). */
export function isFiltered(f: DiscoverFilterState): boolean {
  return (
    f.radius !== DEFAULT_FILTERS.radius ||
    f.isFree !== undefined ||
    f.volunteerEnabled ||
    f.datePreset !== "any"
  );
}

const DISTANCES = [5, 10, 25, 50, 100];
const DATE_OPTIONS: { key: DatePreset; label: string }[] = [
  { key: "any", label: "Any time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];
const PRICE_OPTIONS: { key: string; label: string; isFree: boolean | undefined }[] = [
  { key: "ANY", label: "Any", isFree: undefined },
  { key: "FREE", label: "Free", isFree: true },
  { key: "PAID", label: "Paid", isFree: false },
];

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "min-h-[40px] justify-center rounded-pill border px-4",
        active ? "border-brand bg-brand" : "border-hairline-strong bg-surface",
      )}
    >
      <Text weight="medium" tone={active ? "surface" : "ink"} className="text-sm">
        {label}
      </Text>
    </Pressable>
  );
}

export interface FiltersSheetProps {
  value: DiscoverFilterState;
  onApply: (next: DiscoverFilterState) => void;
}

/** Filters bottom sheet. Parent holds a ref and calls `ref.current.present()`. */
export const FiltersSheet = forwardRef<BottomSheetModal, FiltersSheetProps>(
  function FiltersSheet({ value, onApply }, ref) {
    const insets = useSafeAreaInsets();
    const [draft, setDraft] = useState<DiscoverFilterState>(value);

    // Re-seed the draft whenever the applied filters change (e.g. reopened).
    useEffect(() => setDraft(value), [value]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={["62%"]}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.hairlineStrong }}
      >
        <BottomSheetView style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="gap-6 px-5 pt-2">
            <Text weight="semibold" className="text-xl">
              Filters
            </Text>

            <View className="gap-2">
              <Text weight="medium">Distance</Text>
              <View className="flex-row flex-wrap gap-2">
                {DISTANCES.map((km) => (
                  <Chip
                    key={km}
                    label={`${km} km`}
                    active={draft.radius === km}
                    onPress={() => setDraft((d) => ({ ...d, radius: km }))}
                  />
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Text weight="medium">Date</Text>
              <View className="flex-row flex-wrap gap-2">
                {DATE_OPTIONS.map((o) => (
                  <Chip
                    key={o.key}
                    label={o.label}
                    active={draft.datePreset === o.key}
                    onPress={() => setDraft((d) => ({ ...d, datePreset: o.key }))}
                  />
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Text weight="medium">Price</Text>
              <View className="flex-row flex-wrap gap-2">
                {PRICE_OPTIONS.map((o) => (
                  <Chip
                    key={o.key}
                    label={o.label}
                    active={draft.isFree === o.isFree}
                    onPress={() => setDraft((d) => ({ ...d, isFree: o.isFree }))}
                  />
                ))}
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text weight="medium">Volunteers needed</Text>
                <Text tone="muted" className="text-sm">
                  Only show events looking for volunteers.
                </Text>
              </View>
              <Switch
                value={draft.volunteerEnabled}
                onValueChange={(v) => setDraft((d) => ({ ...d, volunteerEnabled: v }))}
                trackColor={{ true: colors.brand, false: colors.hairlineStrong }}
              />
            </View>

            <View className="flex-row gap-3 pt-2">
              <View className="flex-1">
                <Button
                  variant="secondary"
                  label="Reset"
                  haptic={false}
                  onPress={() => setDraft(DEFAULT_FILTERS)}
                />
              </View>
              <View className="flex-1">
                <Button label="Apply" onPress={() => onApply(draft)} />
              </View>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
