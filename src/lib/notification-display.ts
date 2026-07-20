import { Ionicons } from "@expo/vector-icons";

import type { AppNotification } from "./api/types";

type IoniconName = keyof typeof Ionicons.glyphMap;

export function isUnread(n: AppNotification): boolean {
  // Either field may carry the flag depending on the endpoint.
  return !(n.read ?? n.isRead ?? false);
}

export function notificationText(n: AppNotification): string {
  return n.body ?? n.message ?? "";
}

/** Map a notification type to a friendly icon + tint. */
export function notificationMeta(type?: string): { icon: IoniconName; tint: string } {
  switch ((type ?? "").toUpperCase()) {
    case "FIND_ME_REQUEST":
      return { icon: "navigate-outline", tint: "#FF6B4A" };
    case "TICKET_PURCHASED":
    case "TICKET":
      return { icon: "ticket-outline", tint: "#0E9F6E" };
    case "VOLUNTEER_APPLICATION":
    case "VOLUNTEER_APPROVED":
    case "VOLUNTEER_REJECTED":
      return { icon: "hand-left-outline", tint: "#378ADD" };
    case "EVENT_UPDATE":
    case "EVENT_REMINDER":
    case "EVENT":
      return { icon: "calendar-outline", tint: "#EF9F27" };
    case "CIRCLE_INVITE":
    case "CIRCLE":
      return { icon: "people-outline", tint: "#0F6E56" };
    case "POLL":
    case "POLL_CREATED":
      return { icon: "bar-chart-outline", tint: "#378ADD" };
    case "CONVENER_VERIFICATION_REQUIRED":
      return { icon: "shield-checkmark-outline", tint: "#0E9F6E" };
    default:
      return { icon: "notifications-outline", tint: "#5B636B" };
  }
}
