import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";

import { MapErrorBoundary } from "../../../src/components/app/MapErrorBoundary";
import { ErrorState } from "../../../src/components/app/states";
import { Text } from "../../../src/components/ui";
import { ApiError } from "../../../src/lib/api/client";
import { regionFrom } from "../../../src/lib/maps";
import { useIceLocation } from "../../../src/lib/queries/safety";
import { colors } from "../../../src/theme/tokens";

export default function ContactLocation() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const loc = useIceLocation(userId);

  const lat = loc.data?.latitude;
  const lng = loc.data?.longitude;
  const hasCoords =
    loc.data?.sharingEnabled === true && typeof lat === "number" && typeof lng === "number";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-page">
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-11 w-11 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text weight="semibold" className="text-lg">
          Contact location
        </Text>
      </View>

      {loc.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : loc.isError ? (
        <View className="flex-1 justify-center">
          <ErrorState
            message={
              loc.error instanceof ApiError && (loc.error.status === 403 || loc.error.status === 404)
                ? "You're not authorised to see this person's location."
                : "Couldn't load their location."
            }
            onRetry={() => loc.refetch()}
          />
        </View>
      ) : !hasCoords ? (
        <View className="flex-1 items-center justify-center gap-2 px-8">
          <Ionicons name="location-outline" size={40} color={colors.faint} />
          <Text weight="semibold" className="text-center text-lg">
            Not sharing right now
          </Text>
          <Text tone="muted" className="text-center">
            This person isn&apos;t sharing their live location with you at the moment.
          </Text>
        </View>
      ) : (
        <MapErrorBoundary
          fallback={
            <View className="flex-1 items-center justify-center gap-2 px-8">
              <Ionicons name="map-outline" size={40} color={colors.faint} />
              <Text weight="semibold" className="text-center text-lg">
                Map unavailable
              </Text>
              <Text tone="muted" className="text-center">
                Sharing live at {(lat as number).toFixed(4)}, {(lng as number).toFixed(4)}.
              </Text>
            </View>
          }
        >
          <MapView style={{ flex: 1 }} initialRegion={regionFrom({ lat: lat as number, lng: lng as number })}>
            <Marker coordinate={{ latitude: lat as number, longitude: lng as number }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: colors.coral,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                }}
              >
                <Ionicons name="person" size={16} color="#FFFFFF" />
              </View>
            </Marker>
          </MapView>
        </MapErrorBoundary>
      )}
    </SafeAreaView>
  );
}
