import { useQuery } from "@tanstack/react-query";

import { presignDownload } from "../api/storage";

// Presigned download URLs expire in ~1h, so cache a little under that.
const STALE_MS = 50 * 60 * 1000;

/**
 * Resolve a stored media reference to a renderable URL. Already-absolute URLs
 * are returned as-is; bare R2 keys are resolved via a presigned download URL.
 */
export function useResolvedMedia(keyOrUrl: string | null | undefined) {
  return useQuery({
    queryKey: ["storage", "resolve", keyOrUrl ?? ""],
    enabled: !!keyOrUrl,
    staleTime: STALE_MS,
    gcTime: STALE_MS,
    queryFn: async (): Promise<string | null> => {
      const v = keyOrUrl as string;
      if (/^https?:\/\//i.test(v)) return v;
      const { downloadUrl } = await presignDownload(v);
      return downloadUrl ?? null;
    },
  });
}
