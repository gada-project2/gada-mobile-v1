import { useQuery } from "@tanstack/react-query";

import { listIceContacts } from "../api/ice-contacts";
import { getIceLocation, getIncomingFindMe } from "../api/map-safety";
import { safetyKeys } from "./keys";

const POLL_MS = 15_000;

/**
 * A contact's live location. Enabled only when the caller passes a userId they
 * are authorised to view (the server still enforces ICE-membership + sharing).
 */
export function useIceLocation(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: safetyKeys.iceLocation(userId ?? ""),
    queryFn: () => getIceLocation(userId as string),
    enabled: !!userId && enabled,
    refetchInterval: POLL_MS,
  });
}

/** Incoming Find Me requests (polled; no socket yet). */
export function useIncomingFindMe(enabled = true) {
  return useQuery({
    queryKey: safetyKeys.findMeIncoming(),
    queryFn: getIncomingFindMe,
    enabled,
    refetchInterval: POLL_MS,
  });
}

/** The user's ICE (emergency) contacts. */
export function useIceContacts() {
  return useQuery({
    queryKey: safetyKeys.iceContacts(),
    queryFn: listIceContacts,
  });
}
