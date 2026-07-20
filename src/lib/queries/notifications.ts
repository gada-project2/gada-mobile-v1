import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { getUnreadCount, listNotifications } from "../api/notifications";
import { notificationKeys } from "./keys";

const POLL_MS = 30_000;
const PER_PAGE = 30;

/** Unread badge count — polled + refetch on focus. */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    enabled,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
}

/** Paginated notifications list. `read` filters; undefined = all. */
export function useNotifications(read?: boolean) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(read),
    queryFn: ({ pageParam }) => listNotifications({ read, page: pageParam, perPage: PER_PAGE }),
    initialPageParam: 1,
    refetchOnWindowFocus: true,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.meta?.total;
      const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
      if (total != null) return loaded < total ? allPages.length + 1 : undefined;
      return lastPage.items.length < PER_PAGE ? undefined : allPages.length + 1;
    },
  });
}
