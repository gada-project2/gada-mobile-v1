import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { emptyTier, validateTier, type DraftTier } from "../../lib/tier-draft";
import { colors } from "../../theme/tokens";
import { Button, Card, Pill, Text } from "../ui";
import { TierFields } from "./TierFields";

export interface TierEditorProps {
  value: DraftTier[];
  onChange: (tiers: DraftTier[]) => void;
}

/** Add/remove ticket tiers as local drafts (used by the create wizard). */
export function TierEditor({ value, onChange }: TierEditorProps) {
  const [draft, setDraft] = useState<DraftTier>(emptyTier());
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const err = validateTier(draft);
    if (err) {
      setError(err);
      return;
    }
    onChange([...value, draft]);
    setDraft(emptyTier());
    setError(null);
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <View className="gap-4">
      {value.length > 0 ? (
        <View className="gap-2">
          {value.map((t, i) => (
            <Card key={i} className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text weight="medium">{t.name || "Untitled tier"}</Text>
                <Text tone="muted" className="text-sm">
                  {t.isFree ? "Free" : `₦${t.priceNaira || 0}`} · {t.quantity || 0} available
                </Text>
              </View>
              <Pill tone="neutral" label={t.type.charAt(0) + t.type.slice(1).toLowerCase()} />
              <Pressable
                onPress={() => remove(i)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${t.name}`}
                hitSlop={8}
                className="ml-2 h-9 w-9 items-center justify-center"
              >
                <Ionicons name="trash-outline" size={18} color={colors.muted} />
              </Pressable>
            </Card>
          ))}
        </View>
      ) : null}

      <Card className="gap-4">
        <Text weight="semibold">
          {value.length === 0 ? "Add your first ticket tier" : "Add another tier"}
        </Text>
        <TierFields value={draft} onChange={setDraft} />
        {error ? <Text className="text-sm text-interested">{error}</Text> : null}
        <Button variant="secondary" label="Add tier" onPress={add} />
      </Card>
    </View>
  );
}
