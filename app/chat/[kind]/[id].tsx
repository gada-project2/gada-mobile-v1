import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChatThread } from "../../../src/components/app/ChatThread";
import { Text } from "../../../src/components/ui";
import type { ChatKind } from "../../../src/lib/queries/chat";
import { colors } from "../../../src/theme/tokens";

export default function ChatRoute() {
  const { kind, id, title } = useLocalSearchParams<{ kind: string; id: string; title?: string }>();
  const k = (["direct", "circle", "event"].includes(kind) ? kind : "direct") as ChatKind;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-11 w-11 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text weight="semibold" className="flex-1 text-lg" numberOfLines={1}>
          {title ?? "Chat"}
        </Text>
      </View>
      <ChatThread kind={k} id={id} />
    </SafeAreaView>
  );
}
