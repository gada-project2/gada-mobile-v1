import { apiFetch, apiList } from "./client";
import type { ApiList, AppNotification } from "./types";

// In-app notifications only. POST /notifications/device (FCM) is intentionally
// NOT used yet — real push needs APNs/FCM credentials + EAS config (separate setup).

export interface NotificationFilters {
  read?: boolean;
  page?: number;
  perPage?: number;
}

export function listNotifications(filters: NotificationFilters = {}): Promise<ApiList<AppNotification>> {
  const params = new URLSearchParams();
  if (filters.read !== undefined) params.append("read", String(filters.read));
  params.append("page", String(filters.page ?? 1));
  params.append("perPage", String(filters.perPage ?? 30));
  return apiList<AppNotification>(`/notifications?${params.toString()}`);
}

/** GET /notifications/unread-count -> { unreadCount }. */
export async function getUnreadCount(): Promise<number> {
  const data = await apiFetch<{ unreadCount?: number; count?: number }>(`/notifications/unread-count`);
  return data.unreadCount ?? data.count ?? 0;
}

export function markNotificationRead(id: string): Promise<AppNotification> {
  return apiFetch<AppNotification>(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<void> {
  return apiFetch<void>(`/notifications/read-all`, { method: "PATCH" });
}
