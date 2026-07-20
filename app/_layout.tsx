import "../global.css";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CalendarOverlay } from "../src/components/app/CalendarOverlay";
import { AuthProvider, useAuth } from "../src/lib/auth/AuthContext";
import { SafetyProvider } from "../src/lib/safety/SafetyContext";
import { queryClient } from "../src/lib/query";
import { ThemeProvider } from "../src/theme/ThemeProvider";

// Hold the native splash until fonts AND session bootstrap have resolved.
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const ready = fontsLoaded && status !== "loading";

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Auth-based redirect: guests -> (auth); authed users off the auth screens
  // and the bare index land in (tabs). Authed users are free to navigate to
  // other routes (e.g. /events/[id]) without being bounced back.
  useEffect(() => {
    if (!ready) return;
    const seg0 = segments[0];
    const inAuth = seg0 === "(auth)";
    const atRoot = seg0 === undefined; // the "/" index route

    if (status === "guest" && !inAuth) {
      router.replace("/(auth)/signin");
    } else if (status === "authed" && (inAuth || atRoot)) {
      router.replace("/(tabs)");
    }
  }, [ready, status, segments, router]);

  // Keep the splash up (return nothing) until everything is ready.
  if (!ready) return null;

  return (
    <SafetyProvider>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#F6F7F8" },
          }}
        />
        {/* Swipe-in calendar lives at the shell so it overlays the tabs. */}
        {status === "authed" ? <CalendarOverlay /> : null}
      </View>
    </SafetyProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <BottomSheetModalProvider>
              <AuthProvider>
                <StatusBar style="dark" />
                <RootNavigator fontsLoaded={fontsLoaded} />
              </AuthProvider>
            </BottomSheetModalProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
