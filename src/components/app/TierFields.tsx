import { Pressable, Switch, View } from "react-native";

import { cn } from "../../lib/cn";
import { TIER_TYPES, type DraftTier } from "../../lib/tier-draft";
import { colors } from "../../theme/tokens";
import { Field } from "../auth";
import { Text } from "../ui";

export interface TierFieldsProps {
  value: DraftTier;
  onChange: (next: DraftTier) => void;
}

/** Controlled field set for a single ticket tier (shared by create + manage). */
export function TierFields({ value, onChange }: TierFieldsProps) {
  const set = <K extends keyof DraftTier>(key: K, v: DraftTier[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <View className="gap-4">
      <Field
        label="Tier name"
        placeholder="e.g. Regular, VIP"
        value={value.name}
        onChangeText={(t) => set("name", t)}
      />

      <View className="gap-1.5">
        <Text weight="medium" className="text-sm">
          Type
        </Text>
        <View className="flex-row gap-2">
          {TIER_TYPES.map((t) => {
            const active = value.type === t;
            return (
              <Pressable
                key={t}
                onPress={() => set("type", t)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={cn(
                  "min-h-[40px] flex-1 items-center justify-center rounded-pill border",
                  active ? "border-brand bg-brand" : "border-hairline-strong bg-surface",
                )}
              >
                <Text weight="medium" tone={active ? "surface" : "ink"} className="text-sm">
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text weight="medium">Free tier</Text>
        <Switch
          value={value.isFree}
          onValueChange={(v) => set("isFree", v)}
          trackColor={{ true: colors.brand, false: colors.hairlineStrong }}
        />
      </View>

      {!value.isFree ? (
        <Field
          label="Price (₦)"
          placeholder="5000"
          keyboardType="number-pad"
          value={value.priceNaira}
          onChangeText={(t) => set("priceNaira", t.replace(/[^0-9.]/g, ""))}
          hint="Entered in naira; converted to kobo automatically."
        />
      ) : null}

      <Field
        label="Quantity"
        placeholder="100"
        keyboardType="number-pad"
        value={value.quantity}
        onChangeText={(t) => set("quantity", t.replace(/[^0-9]/g, ""))}
      />

      <Field
        label="Perks (optional)"
        placeholder="Front row, free drink"
        value={value.perks}
        onChangeText={(t) => set("perks", t)}
        hint="Separate with commas."
      />

      <Field
        label="Description (optional)"
        placeholder="What's included"
        value={value.description}
        onChangeText={(t) => set("description", t)}
        multiline
      />
    </View>
  );
}
