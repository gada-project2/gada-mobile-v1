import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, View } from "react-native";

import { cn } from "../../lib/cn";
import { Text } from "../ui";

export interface Segment<T extends string> {
  key: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (key: T) => void;
}

/**
 * Native-style segmented tab control: a scrollable row of labels with a brand
 * underline on the active segment (not web tabs).
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="border-b border-hairline">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 4 }}
      >
        {segments.map((s) => {
          const active = s.key === value;
          return (
            <Pressable
              key={s.key}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(s.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={cn(
                "min-h-[44px] justify-center border-b-2 px-3",
                active ? "border-brand" : "border-transparent",
              )}
            >
              <Text
                weight={active ? "semibold" : "medium"}
                tone={active ? "brand-ink" : "muted"}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
