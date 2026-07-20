import { apiFetch } from "./client";
import type { CreateIceContactDto, IceContact } from "./types";

/** GET /users/me/ice-contacts — the user's emergency contacts. */
export function listIceContacts(): Promise<IceContact[]> {
  return apiFetch<IceContact[]>(`/users/me/ice-contacts`);
}

export function createIceContact(dto: CreateIceContactDto): Promise<IceContact> {
  return apiFetch<IceContact>(`/users/me/ice-contacts`, { method: "POST", body: dto });
}

export function deleteIceContact(contactId: string): Promise<void> {
  return apiFetch<void>(`/users/me/ice-contacts/${contactId}`, { method: "DELETE" });
}
