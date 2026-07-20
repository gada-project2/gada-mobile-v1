import { useRef } from "react";
import { Pressable, TextInput, View } from "react-native";

import { cn } from "../../lib/cn";
import { Text } from "../ui/Text";

export interface OtpInputProps {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  error?: boolean;
  /** Fires once the full code has been entered. */
  onComplete?: (value: string) => void;
}

/**
 * Segmented 6-digit OTP input. A single full-bleed transparent TextInput
 * captures input (so OS one-time-code autofill works) while the boxes render
 * the digits. Tapping anywhere focuses the input.
 */
export function OtpInput({
  value,
  onChangeText,
  length = 6,
  autoFocus,
  error,
  onComplete,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, length);
    onChangeText(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityLabel="One-time code"
      accessibilityRole="none"
    >
      <View className="flex-row justify-between gap-2">
        {Array.from({ length }).map((_, i) => {
          const char = value[i] ?? "";
          const isActive = i === value.length;
          return (
            <View
              key={i}
              className={cn(
                "h-14 flex-1 items-center justify-center rounded-md border bg-surface",
                error
                  ? "border-interested"
                  : isActive
                    ? "border-brand"
                    : "border-hairline-strong",
              )}
            >
              <Text weight="semibold" className="text-xl">
                {char}
              </Text>
            </View>
          );
        })}
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        className="absolute h-full w-full opacity-0"
      />
    </Pressable>
  );
}
