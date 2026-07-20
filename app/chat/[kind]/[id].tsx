import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChatThread } from "../../../src/components/app/ChatThread";
import { Text } from "../../../src/components/ui";
import type { ChatKind } from "../../../src/lib/queries/chat";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { colors } from "../../../src/theme/tokens";

const SUBTITLE: Record<ChatKind, string> = {
  direct: "Direct message",
  circle: "Circle chat",
  event: "Event chat",
};

export default function ChatRoute() {
  const { kind, id, title } = useLocalSearchParams<{ kind: string; id: string; title?: string }>();
  const k = (["direct", "circle", "event"].includes(kind) ? kind : "direct") as ChatKind;
  const theme = useTheme();
  const dark = theme.mode === "dark";

  // Participants link — a real destination only for group contexts:
  // circle -> its members screen, event -> the event (attendees). DMs: none.
  const openParticipants =
    k === "circle"
      ? () => router.push({ pathname: "/circles/[id]", params: { id } })
      : k === "event"
        ? () => router.push({ pathname: "/events/[id]", params: { id } })
        : null;

  return (
    <SafeAreaView
      edges={["top"]}
      className={dark ? "flex-1" : "flex-1 bg-page"}
      style={dark ? { backgroundColor: theme.background.primary } : undefined}
    >
      <View
        className="flex-row items-center gap-2 px-3 py-2"
        style={dark ? { borderBottomWidth: 1, borderBottomColor: theme.border } : undefined}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-11 w-11 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={dark ? theme.text.primary : colors.ink} />
        </Pressable>
        <View className="flex-1">
          <Text weight="semibold" className="text-lg" numberOfLines={1} style={dark ? { color: theme.text.primary } : undefined}>
            {title ?? "Chat"}
          </Text>
          <Text className="text-xs" style={{ color: dark ? theme.text.tertiary : colors.muted }}>
            {SUBTITLE[k]}
          </Text>
        </View>
        {openParticipants ? (
          <Pressable
            onPress={openParticipants}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={k === "circle" ? "View members" : "View event"}
            className="h-11 w-11 items-center justify-center"
          >
            <Ionicons name="people-outline" size={22} color={dark ? theme.text.primary : colors.ink} />
          </Pressable>
        ) : null}
      </View>
      <ChatThread kind={k} id={id} />
    </SafeAreaView>
  );
}
