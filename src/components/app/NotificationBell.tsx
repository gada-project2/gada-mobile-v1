import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { useUnreadCount } from "../../lib/queries/notifications";
import { colors } from "../../theme/tokens";
import { Text } from "../ui";

/** Header bell with an unread-count badge. Polls the count; taps to the list. */
export function NotificationBell() {
  const unread = useUnreadCount();
  const count = unread.data ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      hitSlop={8}
      className="h-11 w-11 items-center justify-center rounded-pill bg-surface"
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        router.push("/notifications");
      }}
    >
      <Ionicons name="notifications-outline" size={22} color={colors.ink} />
      {count > 0 ? (
        <View
          className="absolute right-1 top-1 min-w-[18px] items-center justify-center rounded-pill px-1"
          style={{ height: 18, backgroundColor: colors.coral }}
        >
          <Text weight="semibold" tone="surface" className="text-[10px]">
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
