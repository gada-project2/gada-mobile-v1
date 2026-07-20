import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  addInterest,
  getGadaring,
  getInterestStatus,
  getPingPoints,
  getTickets,
  getTrending,
  getVolunteerConfig,
  listGadarings,
  removeInterest,
  type DiscoverFilters,
} from "../api/gadarings";
import { gadaringKeys } from "./keys";

const DEFAULT_PER_PAGE = 20;

export type DiscoverInput = Omit<DiscoverFilters, "page">;

/** Infinite, paginated discover list. Flatten with `data.pages.flatMap(p => p.items)`. */
export function useDiscover(filters: DiscoverInput) {
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;

  return useInfiniteQuery({
    queryKey: gadaringKeys.list(filters),
    queryFn: ({ pageParam }) =>
      listGadarings({ ...filters, perPage, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.meta?.total;
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      // Stop when we've loaded everything, or when a page comes back short.
      if (total != null) return loaded < total ? allPages.length + 1 : undefined;
      return lastPage.items.length < perPage ? undefined : allPages.length + 1;
    },
  });
}

/**
 * Single-page event fetch for the discovery map. Unlike `useDiscover` this is a
 * flat query (markers, not an infinite feed) with a larger page so a region is
 * well-covered. Pass `enabled: false` to hold off until the user searches.
 */
export function useMapGadarings(
  filters: Omit<DiscoverFilters, "page" | "perPage">,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: gadaringKeys.map(filters),
    queryFn: () => listGadarings({ ...filters, perPage: 100 }),
    enabled: options?.enabled ?? true,
    select: (page) => page.items,
  });
}

export function useTrending(filters: DiscoverFilters) {
  return useQuery({
    queryKey: gadaringKeys.trending(filters),
    queryFn: () => getTrending(filters),
  });
}

export function useGadaring(id: string | undefined) {
  return useQuery({
    queryKey: gadaringKeys.detail(id ?? ""),
    queryFn: () => getGadaring(id as string),
    enabled: !!id,
  });
}

export function useTickets(id: string | undefined) {
  return useQuery({
    queryKey: gadaringKeys.tickets(id ?? ""),
    queryFn: () => getTickets(id as string),
    enabled: !!id,
  });
}

/** Per-user interest status for an event (detail screen only — see api note). */
export function useInterestStatus(id: string | undefined) {
  return useQuery({
    queryKey: gadaringKeys.interest(id ?? ""),
    queryFn: () => getInterestStatus(id as string),
    enabled: !!id,
  });
}

/** Toggle interest (POST/DELETE), with an optimistic flip of the status cache. */
export function useToggleInterest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (next: boolean) => (next ? addInterest(id) : removeInterest(id)),
    onMutate: async (next: boolean) => {
      await qc.cancelQueries({ queryKey: gadaringKeys.interest(id) });
      const prev = qc.getQueryData<boolean>(gadaringKeys.interest(id));
      qc.setQueryData(gadaringKeys.interest(id), next);
      return { prev };
    },
    onError: (_e, _next, ctx) => {
      if (ctx) qc.setQueryData(gadaringKeys.interest(id), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: gadaringKeys.interest(id) });
    },
  });
}

export function useVolunteerConfig(id: string | undefined) {
  return useQuery({
    queryKey: gadaringKeys.volunteerConfig(id ?? ""),
    queryFn: () => getVolunteerConfig(id as string),
    enabled: !!id,
  });
}

export function usePingPoints(id: string | undefined) {
  return useQuery({
    queryKey: gadaringKeys.pingPoints(id ?? ""),
    queryFn: () => getPingPoints(id as string),
    enabled: !!id,
  });
}
