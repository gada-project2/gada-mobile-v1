import { forwardRef } from "react";
import { TextInput, View, type TextInputProps } from "react-native";

import { cn } from "../../lib/cn";
import { colors } from "../../theme/tokens";
import { Text } from "../ui/Text";

export interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
}

/**
 * Themed labelled text input with error/hint copy. RHF-ready: drive it from a
 * <Controller> by passing value / onChangeText / onBlur, and forward the error
 * via `error`. Forwards a ref to the underlying TextInput for focus chaining.
 */
export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, hint, className, ...props },
  ref,
) {
  return (
    <View className="gap-1.5">
      <Text weight="medium" className="text-sm">
        {label}
      </Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.faint}
        accessibilityLabel={label}
        className={cn(
          "min-h-[48px] rounded-md border bg-surface px-4 font-sans text-base text-ink",
          error ? "border-interested" : "border-hairline-strong",
          className,
        )}
        {...props}
      />
      {error ? (
        <Text className="text-sm text-interested">{error}</Text>
      ) : hint ? (
        <Text tone="faint" className="text-sm">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
