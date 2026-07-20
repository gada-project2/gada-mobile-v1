import * as Haptics from "expo-haptics";
import { Pressable, ScrollView } from "react-native";

import type { Category } from "../../lib/api/types";
import { CATEGORY_LIST } from "../../lib/categories";
import { cn } from "../../lib/cn";
import { Text } from "../ui";

export interface CategoryChipsProps {
  value?: Category;
  onChange: (next?: Category) => void;
}

/** Horizontal, scrollable category chips. Tapping the active chip clears it. */
export function CategoryChips({ value, onChange }: CategoryChipsProps) {
  const select = (key: Category) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(value === key ? undefined : key);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {CATEGORY_LIST.map((c) => {
        const active = value === c.key;
        return (
          <Pressable
            key={c.key}
            onPress={() => select(c.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={cn(
              "min-h-[40px] justify-center rounded-pill border px-4",
              active ? "border-brand bg-brand" : "border-hairline-strong bg-surface",
            )}
          >
            <Text weight="medium" tone={active ? "surface" : "ink"} className="text-sm">
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
