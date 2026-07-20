import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SplashBackground } from "../src/components/theme/SplashBackground";
import { Logo, Text } from "../src/components/ui";
import { primaryScale } from "../src/theme/tokens";

// Light lavender accent for "Gather" — the palette's light purple tint (300).
const GATHER_ACCENT = primaryScale[300];

// Welcome / onboarding splash: the gada logo + tagline over the concert image.
// The root navigator redirects "/" to (auth) or (tabs) once session bootstrap
// resolves; this is the branded first panel shown before sign-in.
export default function Index() {
  return (
    <SplashBackground>
      {/* Dark image -> light status bar icons for this screen only. */}
      <StatusBar style="light" />
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center gap-6 px-8">
          <Logo height={130} tint="#FFFFFF" />
          <Text
            tone="surface"
            weight="semibold"
            className="text-center"
            style={{ fontSize: 36, lineHeight: 42 }}
          >
            {"Let's "}
            <Text weight="semibold" style={{ color: GATHER_ACCENT, fontSize: 36 }}>
              Gather.
            </Text>
          </Text>
        </View>

        <View className="items-center px-8 pb-12">
          <Text
            weight="medium"
            className="text-center"
            style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, letterSpacing: 0.3 }}
          >
            Discover. Connect. Celebrate.
          </Text>
        </View>
      </SafeAreaView>
    </SplashBackground>
  );
}
