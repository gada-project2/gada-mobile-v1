import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import type { PingPoint } from "../../lib/api/types";
import { DEFAULT_DELTA, openDirections } from "../../lib/maps";
import { colors } from "../../theme/tokens";
import { Button, Text } from "../ui";
import { MapErrorBoundary } from "./MapErrorBoundary";

interface VenueMapProps {
  /** Venue coordinates (the event's own lat/lng), if pinned. */
  latitude?: number;
  longitude?: number;
  /** Venue label used for the directions deep-link. */
  label?: string;
  points: PingPoint[];
}

/**
 * A compact venue map: the venue marker (brand) plus ping points (coral), with a
 * "directions" action that opens the native maps app. Renders only when at least
 * one coordinate is available — callers fall back to a list otherwise.
 */
export function VenueMap({ latitude, longitude, label, points }: VenueMapProps) {
  const mapRef = useRef<MapView>(null);
  const hasVenue = typeof latitude === "number" && typeof longitude === "number";

  // Centre on the venue, else on the first ping point.
  const centre = hasVenue
    ? { latitude: latitude as number, longitude: longitude as number }
    : { latitude: points[0].latitude, longitude: points[0].longitude };

  // Directions target: the venue if pinned, otherwise the first ping point.
  const dest = hasVenue
    ? { lat: latitude as number, lng: longitude as number }
    : { lat: points[0].latitude, lng: points[0].longitude };

  const allCoords = [
    ...(hasVenue ? [{ latitude: latitude as number, longitude: longitude as number }] : []),
    ...points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
  ];

  return (
    <View className="gap-3">
      <MapErrorBoundary
        fallback={
          <View className="items-center justify-center gap-1 rounded-md border border-hairline bg-surface px-4 py-8">
            <Ionicons name="map-outline" size={24} color={colors.faint} />
            <Text tone="muted" className="text-sm">
              Map preview unavailable — use directions below.
            </Text>
          </View>
        }
      >
        <View className="overflow-hidden rounded-md border border-hairline">
          <MapView
            ref={mapRef}
            style={{ width: "100%", height: 200 }}
            initialRegion={{ ...centre, ...DEFAULT_DELTA }}
            onMapReady={() => {
              if (allCoords.length > 1) {
                mapRef.current?.fitToCoordinates(allCoords, {
                  edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
                  animated: false,
                });
              }
            }}
            scrollEnabled
            zoomEnabled
          >
            {hasVenue ? (
              <Marker
                coordinate={{ latitude: latitude as number, longitude: longitude as number }}
                title={label}
                tracksViewChanges={false}
              >
                <Pin color={colors.brand} icon="location" />
              </Marker>
            ) : null}
            {points.map((p) => (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                title={p.label}
                description={p.description}
                tracksViewChanges={false}
              >
                <Pin color={colors.coral} icon="navigate" />
              </Marker>
            ))}
          </MapView>
        </View>
      </MapErrorBoundary>

      <Button
        variant="secondary"
        label="Directions"
        onPress={() => openDirections(dest.lat, dest.lng, label)}
      />
    </View>
  );
}

function Pin({ color, icon }: { color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 4,
      }}
    >
      <Ionicons name={icon} size={16} color="#FFFFFF" />
    </View>
  );
}
