import { Linking, Platform } from "react-native";
import type { Region } from "react-native-maps";

import type { Coords } from "./location";

/** A comfortable default zoom (~city block) for venue + region maps. */
export const DEFAULT_DELTA = { latitudeDelta: 0.05, longitudeDelta: 0.05 } as const;

/** Build an initial map region from a centre point. */
export function regionFrom(coords: Coords): Region {
  return {
    latitude: coords.lat,
    longitude: coords.lng,
    ...DEFAULT_DELTA,
  };
}

/**
 * Approximate the visible radius (km) of a region from its latitude span.
 * radius ≈ half the visible height; 1° latitude ≈ 111 km. Clamped to a sane
 * range so a fully-zoomed-out map doesn't ask the API for the whole planet.
 */
export function regionToRadiusKm(region: Region): number {
  const km = (region.latitudeDelta / 2) * 111;
  return Math.min(500, Math.max(1, Math.round(km)));
}

/** Great-circle distance (km) between two points — used to decide when the map has moved enough to re-search. */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Open the platform's native maps app with directions to a destination.
 * iOS -> Apple Maps, Android -> the geo: scheme (Google Maps / chooser).
 * Falls back to a Google Maps web URL if the native scheme can't open.
 */
export async function openDirections(lat: number, lng: number, label?: string): Promise<void> {
  const encodedLabel = label ? encodeURIComponent(label) : "";
  const native =
    Platform.OS === "ios"
      ? `maps://?daddr=${lat},${lng}${encodedLabel ? `&q=${encodedLabel}` : ""}`
      : `geo:${lat},${lng}?q=${lat},${lng}${encodedLabel ? `(${encodedLabel})` : ""}`;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  try {
    const supported = await Linking.canOpenURL(native);
    await Linking.openURL(supported ? native : web);
  } catch {
    await Linking.openURL(web).catch(() => {});
  }
}
