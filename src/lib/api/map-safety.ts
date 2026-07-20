import { apiFetch } from "./client";
import type {
  FindMeAction,
  FindMeRequest,
  IceLocation,
  SendFindMeDto,
  UpdateLocationDto,
} from "./types";

// CONSENT RULE (docs-json): GET /map/ice-location/{userId} only returns data when
// the target enabled sharing AND the requester is in the target's ICE list — the
// server enforces this. SOS/panic + arrival/departure endpoints do NOT exist.

/** PATCH my live location. sharingEnabled:false stops broadcasting. */
export function updateIceLocation(dto: UpdateLocationDto): Promise<IceLocation> {
  return apiFetch<IceLocation>(`/map/ice-location`, { method: "PATCH", body: dto });
}

/** GET a contact's live location (authorised ICE contacts only; may be null coords). */
export function getIceLocation(userId: string): Promise<IceLocation> {
  return apiFetch<IceLocation>(`/map/ice-location/${userId}`);
}

/** POST a Find Me request to an ICE contact (one PENDING at a time). */
export function sendFindMe(dto: SendFindMeDto): Promise<FindMeRequest> {
  return apiFetch<FindMeRequest>(`/map/find-me`, { method: "POST", body: dto });
}

/** GET pending incoming Find Me requests for me. */
export function getIncomingFindMe(): Promise<FindMeRequest[]> {
  return apiFetch<FindMeRequest[]>(`/map/find-me/incoming`);
}

/** PATCH accept|reject an incoming Find Me request (recipient only). */
export function respondFindMe(requestId: string, action: FindMeAction): Promise<FindMeRequest> {
  return apiFetch<FindMeRequest>(`/map/find-me/${requestId}`, { method: "PATCH", body: { action } });
}
