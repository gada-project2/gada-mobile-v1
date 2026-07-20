import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, type Region } from "react-native-maps";

import { EventCard } from "../../src/components/app/EventCard";
import { EventMarker } from "../../src/components/app/EventMarker";
import { MapErrorBoundary } from "../../src/components/app/MapErrorBoundary";
import { Text } from "../../src/components/ui";
import type { Gadaring } from "../../src/lib/api/types";
import { categoryMeta } from "../../src/lib/categories";
import { isLive } from "../../src/lib/gadaring-display";
import { useDeviceLocation, type Coords } from "../../src/lib/location";
import { distanceKm, regionFrom, regionToRadiusKm } from "../../src/lib/maps";
import { useMapGadarings } from "../../src/lib/queries/gadarings";
import { colors } from "../../src/theme/tokens";

type IoniconName = keyof typeof Ionicons.glyphMap;

// Only events that carry coordinates can be placed on the map.
function hasCoords(e: Gadaring): e is Gadaring & { latitude: number; longitude: number } {
  return typeof e.latitude === "number" && typeof e.longitude === "number";
}

export default function MapScreen() {
  // Maps can fail to initialise on an Android release build (e.g. a missing
  // Google Maps API key). Degrade to a list of nearby events instead of
  // crashing the whole tab. See app.config.js for the key wiring.
  return (
    <MapErrorBoundary fallback={<MapUnavailableFallback />}>
      <MapScreenInner />
    </MapErrorBoundary>
  );
}

function MapScreenInner() {
  const insets = useSafeAreaInsets();
  const { coords, usingFallback, fallbackLabel, status, resolving } = useDeviceLocation();
  const mapRef = useRef<MapView>(null);

  // The centre + radius we last asked the API for (not every pan — see below).
  const [search, setSearch] = useState<{ center: Coords; radius: number }>({
    center: coords,
    radius: 50,
  });
  // The map's current visible region (updated as the user pans/zooms).
  const region = useRef<Region>(regionFrom(coords));
  const [canSearchHere, setCanSearchHere] = useState(false);
  const [selected, setSelected] = useState<Gadaring | null>(null);
  const didCenterOnUser = useRef(false);

  const query = useMapGadarings({
    lat: search.center.lat,
    lng: search.center.lng,
    radius: search.radius,
  });
  const events = useMemo(() => (query.data ?? []).filter(hasCoords), [query.data]);
  const dropped = (query.data?.length ?? 0) - events.length;

  // Recentre on the user once their real location resolves (we start on the
  // Abuja fallback so the map renders immediately).
  useEffect(() => {
    if (usingFallback || didCenterOnUser.current) return;
    didCenterOnUser.current = true;
    const r = regionFrom(coords);
    region.current = r;
    mapRef.current?.animateToRegion(r, 600);
    setSearch({ center: coords, radius: regionToRadiusKm(r) });
  }, [usingFallback, coords]);

  const onRegionChangeComplete = useCallback(
    (r: Region) => {
      region.current = r;
      // Offer "search this area" once the centre has drifted past ~40% of the
      // searched radius — avoids refetching on every small pan.
      const moved = distanceKm(search.center, { lat: r.latitude, lng: r.longitude });
      setCanSearchHere(moved > Math.max(2, search.radius * 0.4));
    },
    [search],
  );

  const searchThisArea = () => {
    Haptics.selectionAsync().catch(() => {});
    const r = region.current;
    setSearch({
      center: { lat: r.latitude, lng: r.longitude },
      radius: regionToRadiusKm(r),
    });
    setCanSearchHere(false);
  };

  const recenter = () => {
    Haptics.selectionAsync().catch(() => {});
    mapRef.current?.animateToRegion(regionFrom(coords), 500);
  };

  const onMarkerPress = (event: Gadaring) => {
    Haptics.selectionAsync().catch(() => {});
    setSelected(event);
  };

  return (
    <View className="flex-1 bg-page">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={regionFrom(coords)}
        // The blue dot only renders with this prop AND granted permission. Gate
        // it on status so the prop flips false->true once permission resolves,
        // which forces react-native-maps to enable the location layer *after*
        // the grant (setting it true at mount, pre-grant, silently no-ops on
        // Android release and never re-enables).
        showsUserLocation={status === "granted"}
        showsMyLocationButton={Platform.OS === "android" && status === "granted"}
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={() => setSelected(null)}
        // Clustering skipped for now (TODO): marker count is bounded by the
        // single-page region fetch; revisit if dense cities need it.
      >
        {events.map((event) => (
          <Marker
            key={event.id}
            coordinate={{ latitude: event.latitude, longitude: event.longitude }}
            onPress={() => onMarkerPress(event)}
            tracksViewChanges={false}
          >
            <EventMarker
              live={isLive(event)}
              icon={categoryMeta(event.category).icon as IoniconName}
              selected={selected?.id === event.id}
            />
          </Marker>
        ))}
      </MapView>

      {/* Top status pill */}
      <View
        pointerEvents="box-none"
        style={{ top: insets.top + 12 }}
        className="absolute left-0 right-0 items-center gap-2 px-4"
      >
        <View className="flex-row items-center gap-1.5 rounded-pill bg-surface px-4 py-2 shadow-sm">
          <Ionicons name="location-outline" size={14} color={colors.muted} />
          <Text tone="muted" className="text-sm">
            {resolving
              ? "Finding your location…"
              : query.isFetching
                ? "Searching this area…"
                : usingFallback
                  ? `Near ${fallbackLabel}`
                  : `${events.length} ${events.length === 1 ? "event" : "events"} nearby`}
          </Text>
          {resolving || query.isFetching ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : null}
        </View>

        {/* Permission denied: explain the default area + offer to enable it. */}
        {status === "denied" && !resolving ? (
          <Pressable
            onPress={() => Linking.openSettings().catch(() => {})}
            accessibilityRole="button"
            accessibilityLabel="Enable location in settings"
            className="flex-row items-center gap-1.5 rounded-pill bg-ink px-4 py-2 shadow-sm"
          >
            <Ionicons name="navigate-outline" size={15} color="#FFFFFF" />
            <Text weight="semibold" tone="surface" className="text-sm">
              Enable location
            </Text>
          </Pressable>
        ) : null}

        {canSearchHere && !query.isFetching ? (
          <Pressable
            onPress={searchThisArea}
            accessibilityRole="button"
            accessibilityLabel="Search this area"
            className="flex-row items-center gap-1.5 rounded-pill bg-brand px-4 py-2 shadow-sm"
          >
            <Ionicons name="refresh" size={15} color="#FFFFFF" />
            <Text weight="semibold" tone="surface" className="text-sm">
              Search this area
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Recenter button */}
      <Pressable
        onPress={recenter}
        accessibilityRole="button"
        accessibilityLabel="Centre on my location"
        style={{ bottom: (selected ? 220 : 24) + insets.bottom }}
        className="absolute right-4 h-12 w-12 items-center justify-center rounded-pill bg-surface shadow-sm"
      >
        <Ionicons name="locate" size={22} color={colors.brand} />
      </Pressable>

      {/* Error state */}
      {query.isError ? (
        <View
          pointerEvents="box-none"
          style={{ bottom: insets.bottom + 24 }}
          className="absolute left-4 right-4 items-center"
        >
          <Pressable
            onPress={() => query.refetch()}
            className="flex-row items-center gap-2 rounded-pill bg-interested px-4 py-2.5"
          >
            <Ionicons name="warning-outline" size={16} color="#FFFFFF" />
            <Text weight="medium" tone="surface" className="text-sm">
              Couldn't load events. Tap to retry.
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Empty state (loaded, nothing here) */}
      {!query.isFetching && !query.isError && events.length === 0 ? (
        <View
          pointerEvents="none"
          style={{ bottom: insets.bottom + 24 }}
          className="absolute left-4 right-4 items-center"
        >
          <View className="items-center gap-1 rounded-md bg-surface px-5 py-3 shadow-sm">
            <Text weight="medium" className="text-sm">
              No pinned events here
            </Text>
            <Text tone="muted" className="text-center text-xs">
              {dropped > 0
                ? `${dropped} nearby event${dropped === 1 ? "" : "s"} have no location set.`
                : "Pan to another area or zoom out, then search."}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Selected event card */}
      {selected ? (
        <View
          style={{ bottom: insets.bottom + 16 }}
          className="absolute left-4 right-4"
        >
          <View className="relative">
            <Pressable
              onPress={() => setSelected(null)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              hitSlop={8}
              className="absolute -top-2 -right-2 z-10 h-8 w-8 items-center justify-center rounded-pill bg-ink"
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </Pressable>
            <EventCard event={selected} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

// Shown when the native map fails to initialise (caught by MapErrorBoundary).
// Re-uses the same query (react-query cache, so no extra fetch) to list the
// nearby events as cards — the map's job, minus the map.
function MapUnavailableFallback() {
  const insets = useSafeAreaInsets();
  const { coords, usingFallback, fallbackLabel } = useDeviceLocation();
  const query = useMapGadarings({ lat: coords.lat, lng: coords.lng, radius: 50 });
  const events = useMemo(() => (query.data ?? []).filter(hasCoords), [query.data]);

  return (
    <View className="flex-1 bg-page" style={{ paddingTop: insets.top + 12 }}>
      <View className="mx-4 mb-3 flex-row items-center gap-2 rounded-md bg-surface px-4 py-3 shadow-sm">
        <Ionicons name="map-outline" size={18} color={colors.muted} />
        <Text tone="muted" className="flex-1 text-sm">
          Map couldn&apos;t load here — showing nearby events as a list
          {usingFallback ? ` near ${fallbackLabel}` : ""}.
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
          gap: 12,
        }}
      >
        {query.isLoading ? (
          <ActivityIndicator color={colors.brand} />
        ) : events.length === 0 ? (
          <Text tone="muted" className="px-1 text-sm">
            No nearby events with a location.
          </Text>
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </ScrollView>
    </View>
  );
}
