import { apiFetch, apiList } from "./client";
import type {
  ApiList,
  Assignee,
  CreateAssigneeDto,
  CreateGadaringDto,
  CreatePingPointDto,
  CreateTicketDto,
  Gadaring,
  PingPoint,
  RepeatGadaringDto,
  Ticket,
  UpdateGadaringDto,
  UpdateTicketDto,
} from "./types";

export interface MyGadaringsFilters {
  status?: "DRAFT" | "PUBLISHED" | "ONGOING" | "COMPLETED";
  page?: number;
  perPage?: number;
}

function toQuery(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === "") continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// NOTE: there is intentionally NO verifyConvener() — the live spec has no
// convener-verification / NIN / KYC endpoint and no CONVENER_VERIFICATION_REQUIRED
// code. Hosting is gated client-side on canConvene; a 403 surfaces a friendly
// "hosting not enabled" state. Do not fake verification (see CLAUDE.md).

// --- Gadaring lifecycle -----------------------------------------------------

export function createGadaring(dto: CreateGadaringDto): Promise<Gadaring> {
  return apiFetch<Gadaring>("/events", { method: "POST", body: dto });
}

export function updateGadaring(id: string, dto: UpdateGadaringDto): Promise<Gadaring> {
  return apiFetch<Gadaring>(`/events/${id}`, { method: "PATCH", body: dto });
}

export function publishGadaring(id: string): Promise<Gadaring> {
  return apiFetch<Gadaring>(`/events/${id}/publish`, { method: "POST" });
}

export function cancelGadaring(id: string): Promise<Gadaring> {
  return apiFetch<Gadaring>(`/events/${id}/cancel`, { method: "POST" });
}

export function repeatGadaring(id: string, dto: RepeatGadaringDto): Promise<Gadaring> {
  return apiFetch<Gadaring>(`/events/${id}/repeat`, { method: "POST", body: dto });
}

export function listMyGadarings(filters: MyGadaringsFilters = {}): Promise<ApiList<Gadaring>> {
  return apiList<Gadaring>(`/events/my${toQuery(filters as Record<string, unknown>)}`);
}

// --- Ticket tiers -----------------------------------------------------------

export function createTicketTier(gadaringId: string, dto: CreateTicketDto): Promise<Ticket> {
  return apiFetch<Ticket>(`/events/${gadaringId}/tickets`, { method: "POST", body: dto });
}

export function updateTicketTier(
  gadaringId: string,
  ticketId: string,
  dto: UpdateTicketDto,
): Promise<Ticket> {
  return apiFetch<Ticket>(`/events/${gadaringId}/tickets/${ticketId}`, {
    method: "PATCH",
    body: dto,
  });
}

export function deleteTicketTier(gadaringId: string, ticketId: string): Promise<void> {
  return apiFetch<void>(`/events/${gadaringId}/tickets/${ticketId}`, { method: "DELETE" });
}

// --- Ping points ------------------------------------------------------------

export function addPingPoint(gadaringId: string, dto: CreatePingPointDto): Promise<PingPoint> {
  return apiFetch<PingPoint>(`/events/${gadaringId}/ping-points`, { method: "POST", body: dto });
}

export function deletePingPoint(gadaringId: string, pingPointId: string): Promise<void> {
  return apiFetch<void>(`/events/${gadaringId}/ping-points/${pingPointId}`, { method: "DELETE" });
}

// --- Assignees --------------------------------------------------------------

export function listAssignees(gadaringId: string): Promise<Assignee[]> {
  return apiFetch<Assignee[]>(`/events/${gadaringId}/assignees`);
}

export function addAssignee(gadaringId: string, dto: CreateAssigneeDto): Promise<Assignee> {
  return apiFetch<Assignee>(`/events/${gadaringId}/assignees`, { method: "POST", body: dto });
}

export function removeAssignee(gadaringId: string, assigneeId: string): Promise<void> {
  return apiFetch<void>(`/events/${gadaringId}/assignees/${assigneeId}`, { method: "DELETE" });
}
