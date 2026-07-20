import { apiFetch, apiList } from "./client";
import type {
  ApiList,
  Category,
  Gadaring,
  PingPoint,
  Ticket,
  VolunteerConfigResponse,
} from "./types";

// Filters accepted by GET /events (and trending/sponsored). All optional.
export interface DiscoverFilters {
  category?: Category;
  lat?: number;
  lng?: number;
  radius?: number; // km
  dateFrom?: string; // ISO 8601
  dateTo?: string; // ISO 8601
  isFree?: boolean;
  volunteerEnabled?: boolean;
  status?: "DRAFT" | "PUBLISHED" | "ONGOING" | "COMPLETED";
  page?: number;
  perPage?: number;
}

function toQuery(filters: DiscoverFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Paginated discover list — returns { items, meta:{ page, perPage, total } }. */
export function listGadarings(filters: DiscoverFilters = {}): Promise<ApiList<Gadaring>> {
  return apiList<Gadaring>(`/events${toQuery(filters)}`);
}

/** Trending near the given filters (server caps at ~10). */
export function getTrending(filters: DiscoverFilters = {}): Promise<Gadaring[]> {
  return apiFetch<Gadaring[]>(`/events/trending${toQuery(filters)}`);
}

export function getSponsored(filters: DiscoverFilters = {}): Promise<Gadaring[]> {
  return apiFetch<Gadaring[]>(`/events/sponsored${toQuery(filters)}`);
}

export function getGadaring(id: string): Promise<Gadaring> {
  return apiFetch<Gadaring>(`/events/${id}`);
}

export function getTickets(id: string): Promise<Ticket[]> {
  return apiFetch<Ticket[]>(`/events/${id}/tickets`);
}

export function getVolunteerConfig(id: string): Promise<VolunteerConfigResponse> {
  return apiFetch<VolunteerConfigResponse>(`/events/${id}/volunteer-config`);
}

export function getPingPoints(id: string): Promise<PingPoint[]> {
  return apiFetch<PingPoint[]>(`/events/${id}/ping-points`);
}
