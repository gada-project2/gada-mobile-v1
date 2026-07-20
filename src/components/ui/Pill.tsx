import { View } from "react-native";

import { cn } from "../../lib/cn";
import { Text } from "./Text";

type Tone = "brand" | "coral" | "neutral" | "invited" | "volunteering";

export interface PillProps {
  label: string;
  tone?: Tone;
  className?: string;
}

// tint background + ink text per the status palette. Coral = live/now only.
const toneContainer: Record<Tone, string> = {
  brand: "bg-brand-tint",
  coral: "bg-coral-tint",
  neutral: "bg-hairline",
  invited: "bg-invited-tint",
  volunteering: "bg-volunteering-tint",
};

const toneText: Record<Tone, "brand-ink" | "coral-ink" | "muted" | "invited-ink" | "volunteering-ink"> = {
  brand: "brand-ink",
  coral: "coral-ink",
  neutral: "muted",
  invited: "invited-ink",
  volunteering: "volunteering-ink",
};

/** Small status chip. Sentence case labels. */
export function Pill({ label, tone = "neutral", className }: PillProps) {
  return (
    <View
      className={cn(
        "self-start rounded-pill px-3 py-1",
        toneContainer[tone],
        className,
      )}
    >
      <Text weight="medium" tone={toneText[tone]} className="text-sm">
        {label}
      </Text>
    </View>
  );
}
