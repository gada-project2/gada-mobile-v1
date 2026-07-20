import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

export interface Coords {
  lat: number;
  lng: number;
}

// Fallback when permission is denied/undetermined — never block discover on it.
export const FALLBACK_LOCATION = {
  coords: { lat: 9.0765, lng: 7.3986 } as Coords,
  label: "Abuja",
};

export type LocationStatus = "undetermined" | "granted" | "denied";

export interface DeviceLocation {
  coords: Coords;
  /** True while we're showing the Abuja fallback (permission not granted). */
  usingFallback: boolean;
  status: LocationStatus;
  /** True while the permission request / position fetch is in flight. */
  resolving: boolean;
  fallbackLabel: string;
  /** Re-request permission + position (e.g. from the "enable location" affordance). */
  requestAgain: () => void;
}

/**
 * Resolves the device location gracefully: starts on the Abuja fallback so the
 * screen renders immediately, prompts for foreground permission once, and
 * upgrades to real coordinates if granted. Failures keep the fallback.
 */
export function useDeviceLocation(): DeviceLocation {
  const [coords, setCoords] = useState<Coords>(FALLBACK_LOCATION.coords);
  const [usingFallback, setUsingFallback] = useState(true);
  const [status, setStatus] = useState<LocationStatus>("undetermined");
  const [resolving, setResolving] = useState(true);

  const resolve = useCallback(async () => {
    setResolving(true);
    try {
      // Request foreground permission BEFORE reading any position.
      const perm = await Location.requestForegroundPermissionsAsync();
      setStatus(perm.status as LocationStatus);
      if (perm.status !== "granted") {
        setUsingFallback(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setUsingFallback(false);
    } catch {
      // Keep the fallback on any failure (services off, timeout, etc.).
      setUsingFallback(true);
    } finally {
      setResolving(false);
    }
  }, []);

  useEffect(() => {
    void resolve();
  }, [resolve]);

  return {
    coords,
    usingFallback,
    status,
    resolving,
    fallbackLabel: FALLBACK_LOCATION.label,
    requestAgain: resolve,
  };
}
