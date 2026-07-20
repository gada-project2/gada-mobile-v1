import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect } from "react";

const DEFAULT_TAG = "gada-screen";

/**
 * Robust replacement for expo-keep-awake's `useKeepAwake`. That hook calls
 * `activateKeepAwakeAsync` without catching, so when the native module rejects
 * with "Unable to activate keep awake" — which happens when the activity isn't
 * fully resumed (screen transitions, Fast Refresh) — it surfaces as an uncaught
 * promise rejection / red-box error. We swallow that benign failure: the screen
 * simply may not stay awake in that instant, which is fine.
 */
export function useKeepAwakeSafe(tag: string = DEFAULT_TAG): void {
  useEffect(() => {
    activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      deactivateKeepAwake(tag).catch(() => {});
    };
  }, [tag]);
}
