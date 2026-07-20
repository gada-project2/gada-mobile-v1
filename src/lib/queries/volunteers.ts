import { useQuery } from "@tanstack/react-query";

import {
  getMyVolunteerApplications,
  getVolunteerConfig,
  listApplications,
} from "../api/volunteers";
import { volunteerKeys } from "./keys";

/** Volunteer config + roles for an event (enabled when an id is supplied). */
export function useVolunteerConfig(gadaringId: string | undefined) {
  return useQuery({
    queryKey: volunteerKeys.config(gadaringId ?? ""),
    queryFn: () => getVolunteerConfig(gadaringId as string),
    enabled: !!gadaringId,
  });
}

/** Applications for an event (convener view). */
export function useApplications(gadaringId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: volunteerKeys.applications(gadaringId ?? ""),
    queryFn: () => listApplications(gadaringId as string),
    enabled: !!gadaringId && enabled,
  });
}

/** The current user's applications across all events. */
export function useMyApplications(enabled = true) {
  return useQuery({
    queryKey: volunteerKeys.myApplications(),
    queryFn: getMyVolunteerApplications,
    enabled,
  });
}
