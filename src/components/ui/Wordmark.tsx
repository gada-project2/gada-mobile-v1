import { cn } from "../../lib/cn";
import { Text } from "./Text";

export interface WordmarkProps {
  /** Font size in px (default 28). */
  size?: number;
  className?: string;
}

/**
 * The gada wordmark. Brand rule (hard): always near-black `ink` on a light
 * surface, every theme. Never invert or recolour it.
 */
export function Wordmark({ size = 28, className }: WordmarkProps) {
  return (
    <Text
      weight="semibold"
      tone="ink"
      accessibilityRole="header"
      accessibilityLabel="gada"
      style={{ fontSize: size, lineHeight: size * 1.1 }}
      className={cn(className)}
    >
      gada
    </Text>
  );
}
