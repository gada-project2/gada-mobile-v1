import { useQuery } from "@tanstack/react-query";

import { listAssignees, listMyGadarings, type MyGadaringsFilters } from "../api/manage";
import { manageKeys } from "./keys";

export function useMyGadarings(filters: MyGadaringsFilters = {}) {
  return useQuery({
    queryKey: manageKeys.myGadarings(filters),
    queryFn: () => listMyGadarings(filters),
  });
}

export function useAssignees(gadaringId: string | undefined) {
  return useQuery({
    queryKey: manageKeys.assignees(gadaringId ?? ""),
    queryFn: () => listAssignees(gadaringId as string),
    enabled: !!gadaringId,
  });
}
