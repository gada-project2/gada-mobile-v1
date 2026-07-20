import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, View } from "react-native";

import { cn } from "../../lib/cn";
import { useTheme } from "../../theme/ThemeProvider";
import { Text } from "../ui";

export interface Segment<T extends string> {
  key: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (key: T) => void;
  /** Opt in to the dark/light theme colours. Omit for the legacy emerald look. */
  dark?: boolean;
}

/**
 * Native-style segmented tab control: a scrollable row of labels with a brand
 * underline on the active segment (not web tabs).
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  dark = false,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const themed = dark && theme.mode === "dark";

  return (
    <View
      className={themed ? "" : "border-b border-hairline"}
      style={themed ? { borderBottomWidth: 1, borderBottomColor: theme.border } : undefined}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
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
              className={cn("min-h-[44px] justify-center border-b-2 px-3", !themed && (active ? "border-brand" : "border-transparent"))}
              style={themed ? { borderBottomColor: active ? theme.accent.primary : "transparent" } : undefined}
            >
              <Text
                weight={active ? "semibold" : "medium"}
                tone={active ? "brand-ink" : "muted"}
                style={themed ? { color: active ? theme.accent.primary : theme.text.secondary } : undefined}
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
