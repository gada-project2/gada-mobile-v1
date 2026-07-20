import { useQuery } from "@tanstack/react-query";

import { getCircle, getCircleMedia, listCircles } from "../api/circles";
import { circleKeys } from "./keys";

export function useCircles() {
  return useQuery({
    queryKey: circleKeys.list(),
    queryFn: listCircles,
  });
}

export function useCircle(id: string | undefined) {
  return useQuery({
    queryKey: circleKeys.detail(id ?? ""),
    queryFn: () => getCircle(id as string),
    enabled: !!id,
  });
}

export function useCircleMedia(id: string | undefined) {
  return useQuery({
    queryKey: circleKeys.media(id ?? ""),
    queryFn: () => getCircleMedia(id as string),
    enabled: !!id,
  });
}
