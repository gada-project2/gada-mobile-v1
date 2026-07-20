import type { CurrentUser } from "./api/types";

// Capability model (production): flat booleans on the user object. Hosting is
// gated on `canConvene`; a 403 CONVENER_VERIFICATION_REQUIRED opens NIN verify.
export function canConvene(user: CurrentUser | null | undefined): boolean {
  return user?.canConvene === true;
}

export function isVendor(user: CurrentUser | null | undefined): boolean {
  return user?.isVendor === true;
}

export function isVolunteer(user: CurrentUser | null | undefined): boolean {
  return user?.isVolunteer === true;
}
