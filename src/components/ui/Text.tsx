import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { cn } from "../../lib/cn";

type Weight = "regular" | "medium" | "semibold";
type Tone =
  | "ink"
  | "muted"
  | "faint"
  | "brand"
  | "brand-ink"
  | "coral"
  | "coral-ink"
  | "invited-ink"
  | "volunteering-ink"
  | "surface";

const weightClass: Record<Weight, string> = {
  regular: "font-sans",
  medium: "font-sans-medium",
  semibold: "font-sans-semibold",
};

const toneClass: Record<Tone, string> = {
  ink: "text-ink",
  muted: "text-muted",
  faint: "text-faint",
  brand: "text-brand",
  "brand-ink": "text-brand-ink",
  coral: "text-coral",
  "coral-ink": "text-coral-ink",
  "invited-ink": "text-invited-ink",
  "volunteering-ink": "text-volunteering-ink",
  surface: "text-surface",
};

export interface TextProps extends RNTextProps {
  weight?: Weight;
  tone?: Tone;
  className?: string;
}

/** Themed text in Inter. Sentence case everywhere (a content rule, not enforced here). */
export function Text({
  weight = "regular",
  tone = "ink",
  className,
  ...props
}: TextProps) {
  return (
    <RNText
      className={cn(weightClass[weight], toneClass[tone], "text-base", className)}
      {...props}
    />
  );
}
