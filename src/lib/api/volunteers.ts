import { apiFetch, apiList } from "./client";
import type {
  ApplyVolunteerDto,
  CreateVolunteerRoleDto,
  ReviewAction,
  UpdateVolunteerRoleDto,
  VolunteerApplication,
  VolunteerConfig,
  VolunteerConfigResponse,
  VolunteerRole,
} from "./types";

// --- Config + roles (convener) ---------------------------------------------

/** GET volunteer-config -> { volunteerConfig, roles }. */
export function getVolunteerConfig(gadaringId: string): Promise<VolunteerConfigResponse> {
  return apiFetch<VolunteerConfigResponse>(`/events/${gadaringId}/volunteer-config`);
}

/** POST volunteer-config (no body) -> creates/enables the config. */
export function createVolunteerConfig(gadaringId: string): Promise<VolunteerConfig> {
  return apiFetch<VolunteerConfig>(`/events/${gadaringId}/volunteer-config`, { method: "POST" });
}

export function createVolunteerRole(
  gadaringId: string,
  dto: CreateVolunteerRoleDto,
): Promise<VolunteerRole> {
  return apiFetch<VolunteerRole>(`/events/${gadaringId}/volunteer-config/roles`, {
    method: "POST",
    body: dto,
  });
}

export function updateVolunteerRole(
  gadaringId: string,
  roleId: string,
  dto: UpdateVolunteerRoleDto,
): Promise<VolunteerRole> {
  return apiFetch<VolunteerRole>(`/events/${gadaringId}/volunteer-config/roles/${roleId}`, {
    method: "PATCH",
    body: dto,
  });
}

export function deleteVolunteerRole(gadaringId: string, roleId: string): Promise<void> {
  return apiFetch<void>(`/events/${gadaringId}/volunteer-config/roles/${roleId}`, {
    method: "DELETE",
  });
}

// --- Applications -----------------------------------------------------------

/** POST apply -> the created application. */
export function applyToVolunteer(
  gadaringId: string,
  dto: ApplyVolunteerDto,
): Promise<VolunteerApplication> {
  return apiFetch<VolunteerApplication>(`/events/${gadaringId}/volunteers/apply`, {
    method: "POST",
    body: dto,
  });
}

/** GET applications for an event (convener). Paginated; we take the first page. */
export async function listApplications(gadaringId: string): Promise<VolunteerApplication[]> {
  const res = await apiList<VolunteerApplication>(
    `/events/${gadaringId}/volunteers/applications?perPage=100`,
  );
  return res.items;
}

/** PATCH review (approve | reject) -> the updated application. */
export function reviewApplication(
  gadaringId: string,
  appId: string,
  action: ReviewAction,
): Promise<VolunteerApplication> {
  return apiFetch<VolunteerApplication>(
    `/events/${gadaringId}/volunteers/applications/${appId}`,
    { method: "PATCH", body: { action } },
  );
}

/** The current user's volunteer applications (paginated; we take the first page). */
export async function getMyVolunteerApplications(): Promise<VolunteerApplication[]> {
  const res = await apiList<VolunteerApplication>(`/volunteers/my-applications?perPage=100`);
  return res.items;
}

/** Resolve the event id a volunteer application points at (flat or nested). */
export function applicationGadaringId(a: VolunteerApplication): string | undefined {
  return a.gadaringId ?? a.gadaring?.id;
}
