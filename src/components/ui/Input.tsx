import { Ionicons } from "@expo/vector-icons";
import { forwardRef } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { radius, spacing, typography } from "../../theme/tokens";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

/**
 * Themed labelled text input (reads useTheme()). RHF-ready: drive it from a
 * <Controller> via value / onChangeText / onBlur and forward `error`. Mirrors
 * the auth Field API but styles from the dark/light theme rather than the
 * emerald tokens. Placeholder uses text.tertiary.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, containerStyle, style, ...props },
  ref,
) {
  const theme = useTheme();
  return (
    <View style={[{ gap: spacing.xs + 2 }, containerStyle]}>
      {label ? (
        <Text
          style={{
            color: theme.text.secondary,
            fontFamily: typography.family.medium,
            fontSize: typography.size.sm,
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.text.tertiary}
        accessibilityLabel={label}
        style={[
          {
            minHeight: 48,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: error ? theme.status.error : theme.border,
            backgroundColor: theme.background.surface,
            paddingHorizontal: spacing.md,
            color: theme.text.primary,
            fontFamily: typography.family.regular,
            fontSize: typography.size.base,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text style={{ color: theme.status.error, fontFamily: typography.family.regular, fontSize: typography.size.sm }}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: theme.text.tertiary, fontFamily: typography.family.regular, fontSize: typography.size.sm }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

export interface SearchInputProps extends TextInputProps {
  /** Renders a right-hand filter icon button when provided. */
  onFilterPress?: () => void;
  /** Show a dot on the filter button (active filters). */
  filterActive?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * Rounded search field matching the Discover mockup: surface background, left
 * search icon, optional right filter icon button.
 */
export const SearchInput = forwardRef<TextInput, SearchInputProps>(function SearchInput(
  { onFilterPress, filterActive, containerStyle, style, ...props },
  ref,
) {
  const theme = useTheme();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: spacing.sm }, containerStyle]}>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          height: 48,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.background.surface,
          paddingHorizontal: spacing.md,
        }}
      >
        <Ionicons name="search" size={18} color={theme.text.tertiary} />
        <TextInput
          ref={ref}
          placeholderTextColor={theme.text.tertiary}
          returnKeyType="search"
          style={[
            {
              flex: 1,
              height: "100%",
              color: theme.text.primary,
              fontFamily: typography.family.regular,
              fontSize: typography.size.base,
            },
            style,
          ]}
          {...props}
        />
      </View>
      {onFilterPress ? (
        <Pressable
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel="Filters"
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.full,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.background.surface,
          }}
        >
          <Ionicons name="options-outline" size={18} color={theme.text.primary} />
          {filterActive ? (
            <View
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 8,
                height: 8,
                borderRadius: 9999,
                backgroundColor: theme.accent.primary,
              }}
            />
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
});
