import type { ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import { Logo } from "../ui/Logo";
import { Screen } from "../ui/Screen";
import { Text } from "../ui/Text";

export interface AuthShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Rendered centred below the form (e.g. links to other auth routes). */
  footer?: ReactNode;
}

/**
 * Shared auth screen chrome: gada wordmark on top, centred content, keyboard
 * avoidance, and tap-anywhere-to-dismiss. Screens just supply the form body.
 */
export function AuthShell({ children, title, subtitle, footer }: AuthShellProps) {
  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={Keyboard.dismiss} accessible={false}>
            <View className="gap-7 py-10">
              <View className="items-center gap-2">
                <Logo height={72} />
                {title ? (
                  <Text weight="semibold" className="text-center text-2xl">
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text tone="muted" className="text-center">
                    {subtitle}
                  </Text>
                ) : null}
              </View>

              {children}

              {footer ? <View className="items-center gap-3">{footer}</View> : null}
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
