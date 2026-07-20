import { apiFetch } from "./client";
import type {
  Circle,
  CircleDetail,
  CircleMedia,
  CircleMember,
  CreateCircleDto,
  UpdateCircleDto,
} from "./types";

/** GET /circles -> the user's circles. */
export function listCircles(): Promise<Circle[]> {
  return apiFetch<Circle[]>(`/circles`);
}

// The detail endpoint may return { circle, members } or the circle flat (with a
// nested members array) — normalise both into CircleDetail.
type CircleWithMembers = Circle & { members?: CircleMember[] };
type CircleDetailRaw = CircleWithMembers & { circle?: CircleWithMembers };

/** GET /circles/{id} -> normalised { circle, members[] }. */
export async function getCircle(id: string): Promise<CircleDetail> {
  const data = (await apiFetch<CircleDetailRaw | null>(`/circles/${id}`)) ?? ({} as CircleDetailRaw);
  const circle = (data.circle ?? data) as Circle;
  const members = data.members ?? data.circle?.members ?? [];
  return { circle, members };
}

export function createCircle(dto: CreateCircleDto): Promise<Circle> {
  return apiFetch<Circle>(`/circles`, { method: "POST", body: dto });
}

export function updateCircle(id: string, dto: UpdateCircleDto): Promise<Circle> {
  return apiFetch<Circle>(`/circles/${id}`, { method: "PATCH", body: dto });
}

export function deleteCircle(id: string): Promise<void> {
  return apiFetch<void>(`/circles/${id}`, { method: "DELETE" });
}

/** POST a member by userId -> the updated circle. */
export function addCircleMember(id: string, userId: string): Promise<Circle> {
  return apiFetch<Circle>(`/circles/${id}/members`, { method: "POST", body: { userId } });
}

export function removeCircleMember(id: string, userId: string): Promise<void> {
  return apiFetch<void>(`/circles/${id}/members/${userId}`, { method: "DELETE" });
}

/** Leave a circle you're a member of. */
export function leaveCircle(id: string): Promise<void> {
  return apiFetch<void>(`/circles/${id}/leave`, { method: "DELETE" });
}

/** GET /circles/{id}/media -> shared media items. */
export function getCircleMedia(id: string): Promise<CircleMedia[]> {
  return apiFetch<CircleMedia[]>(`/circles/${id}/media`);
}
