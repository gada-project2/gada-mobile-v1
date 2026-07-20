import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  getCircleMessages,
  getDirectMessages,
  getDirectThreads,
  getEventMessages,
  getPollResults,
} from "../api/chat";
import type { ApiList, ChatMessage } from "../api/types";
import { chatKeys } from "./keys";

export type ChatKind = "direct" | "circle" | "event";

// Light polling for "real-time-ish" history (no socket — see src/lib/realtime).
const POLL_MS = 12_000;

export function useDirectThreads() {
  return useQuery({
    queryKey: chatKeys.directThreads(),
    queryFn: getDirectThreads,
    refetchInterval: POLL_MS,
  });
}

function fetcher(kind: ChatKind, id: string, page: number): Promise<ApiList<ChatMessage>> {
  if (kind === "circle") return getCircleMessages(id, page);
  if (kind === "event") return getEventMessages(id, page);
  return getDirectMessages(id, page);
}

/** Paginated, newest-first chat history with light polling on the first page. */
export function useChatMessages(kind: ChatKind, id: string | undefined) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(kind, id ?? ""),
    queryFn: ({ pageParam }) => fetcher(kind, id as string, pageParam),
    initialPageParam: 1,
    enabled: !!id,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    getNextPageParam: (lastPage, allPages) => {
      // Prefer the API's explicit hasMore (chat shape); fall back to total, then
      // to a short-page heuristic.
      if (typeof lastPage.meta?.hasMore === "boolean") {
        return lastPage.meta.hasMore ? allPages.length + 1 : undefined;
      }
      const total = lastPage.meta?.total;
      const loaded = allPages.reduce((n, p) => n + p.items.length, 0);
      if (total != null) return loaded < total ? allPages.length + 1 : undefined;
      return lastPage.items.length < 50 ? undefined : allPages.length + 1;
    },
  });
}

export function usePollResults(pollId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: chatKeys.pollResults(pollId ?? ""),
    queryFn: () => getPollResults(pollId as string),
    enabled: !!pollId && enabled,
  });
}
