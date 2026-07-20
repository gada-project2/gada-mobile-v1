import { apiFetch } from "./client";
import type {
  ConvenerVerifyResponse,
  CurrentUser,
  PrivacySettings,
  UpdatePrivacyDto,
  UpdateProfileDto,
  UpdateVolunteerProfileDto,
  VolunteerProfile,
} from "./types";

/** PATCH /users/me -> the full updated profile. */
export function updateProfile(dto: UpdateProfileDto): Promise<CurrentUser> {
  return apiFetch<CurrentUser>(`/users/me`, { method: "PATCH", body: dto });
}

/**
 * POST /users/me/convener/verify -> unlocks hosting (canConvene) after a
 * just-in-time NIN + DOB check. `nin` must be exactly 11 digits; `dateOfBirth`
 * is ISO 8601. Throws ApiError on 409 NIN_ALREADY_REGISTERED / 400 validation.
 */
export function verifyConvener(
  nin: string,
  dateOfBirth: string,
): Promise<ConvenerVerifyResponse> {
  return apiFetch<ConvenerVerifyResponse>(`/users/me/convener/verify`, {
    method: "POST",
    body: { nin, dateOfBirth },
  });
}

/** DELETE /users/me -> soft delete + PII wipe. Irreversible. */
export function deleteAccount(): Promise<void> {
  return apiFetch<void>(`/users/me`, { method: "DELETE" });
}

/** GET /users/me/volunteer-profile -> profile or null if not yet created. */
export function getVolunteerProfile(): Promise<VolunteerProfile | null> {
  return apiFetch<VolunteerProfile | null>(`/users/me/volunteer-profile`);
}

/** PUT /users/me/volunteer-profile -> creates or updates the profile. */
export function upsertVolunteerProfile(dto: UpdateVolunteerProfileDto): Promise<VolunteerProfile> {
  return apiFetch<VolunteerProfile>(`/users/me/volunteer-profile`, { method: "PUT", body: dto });
}

export function getPrivacy(): Promise<PrivacySettings> {
  return apiFetch<PrivacySettings>(`/users/me/privacy`);
}

export function updatePrivacy(dto: UpdatePrivacyDto): Promise<PrivacySettings> {
  return apiFetch<PrivacySettings>(`/users/me/privacy`, { method: "PATCH", body: dto });
}
