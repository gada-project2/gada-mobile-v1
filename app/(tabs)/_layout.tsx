import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { View, type ColorValue } from "react-native";

import { TabBarFab } from "../../src/components/ui/TabBarFab";
import { useTheme } from "../../src/theme/ThemeProvider";
import { colors, fonts } from "../../src/theme/tokens";

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IoniconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const router = useRouter();
  const dark = theme.mode === "dark";

  // Bar chrome: dark = mockup (dark surface, purple active tint); light = the
  // current emerald bar, untouched, so today's screens render identically.
  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: dark ? theme.accent.primary : colors.brand,
    tabBarInactiveTintColor: dark ? theme.text.tertiary : colors.faint,
    tabBarStyle: {
      backgroundColor: dark ? theme.background.surface : colors.surface,
      borderTopColor: dark ? theme.border : colors.hairline,
    },
    tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
  } as const;

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("planet-outline") }} />
      <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: tabIcon("compass-outline") }} />

      {/* Centre FAB — only in the dark (mockup) bar; a navigation shortcut to
          /create, not a real tab. In light mode it's hidden (href:null). */}
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          href: dark ? undefined : null,
          tabBarButton: dark
            ? () => (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <TabBarFab onPress={() => router.push("/create")} />
                </View>
              )
            : undefined,
        }}
      />

      {/* Map + Tickets stay full tabs in light; folded out of the 5-item dark bar
          (still reachable via navigation). */}
      <Tabs.Screen
        name="map"
        options={{ title: "Map", href: dark ? null : undefined, tabBarIcon: tabIcon("map-outline") }}
      />
      <Tabs.Screen
        name="tickets"
        options={{ title: "Tickets", href: dark ? null : undefined, tabBarIcon: tabIcon("ticket-outline") }}
      />

      <Tabs.Screen
        name="messages"
        options={{ title: dark ? "Chats" : "Messages", tabBarIcon: tabIcon("chatbubble-outline") }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: tabIcon("person-outline") }} />
    </Tabs>
  );
}
