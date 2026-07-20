import { Pressable } from "react-native";

import { Text } from "../ui/Text";

export interface TextLinkProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** Inline secondary action styled as a link (44px min touch target). */
export function TextLink({ label, onPress, disabled }: TextLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="link"
      accessibilityState={{ disabled: !!disabled }}
      className="min-h-[44px] items-center justify-center px-2"
    >
      <Text tone={disabled ? "faint" : "brand-ink"} weight="medium">
        {label}
      </Text>
    </Pressable>
  );
}
