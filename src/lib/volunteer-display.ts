import type { PillProps } from "../components/ui/Pill";
import type { VolunteerApplication, VolunteerApplicationStatus, VolunteerRole } from "./api/types";

// The role read model varies; read it defensively.
export function roleName(r: Partial<VolunteerRole>): string {
  return r.roleName ?? r.title ?? "Role";
}
export function roleSlots(r: Partial<VolunteerRole>): number | undefined {
  return r.numberNeeded ?? r.slots;
}
export function roleSkills(r: Partial<VolunteerRole>): string[] {
  return r.skillsRequired ?? r.requiredSkills ?? [];
}

export function applicantName(a: VolunteerApplication): string {
  return (
    a.applicantName ??
    a.user?.displayName ??
    a.user?.name ??
    a.user?.email ??
    a.applicantId ??
    a.userId ??
    "Applicant"
  );
}

export function applicationRoleName(a: VolunteerApplication): string {
  return a.roleName ?? a.roleTitle ?? (a.volunteerRole ? roleName(a.volunteerRole) : "Role");
}

/** Status -> pill tone + label (sentence case). */
export function statusPill(status?: VolunteerApplicationStatus): {
  tone: NonNullable<PillProps["tone"]>;
  label: string;
} {
  switch (status) {
    case "APPROVED":
      return { tone: "brand", label: "Approved" };
    case "REJECTED":
      return { tone: "coral", label: "Rejected" };
    case "SUSPENDED":
      return { tone: "coral", label: "Suspended" };
    case "WITHDRAWN":
      return { tone: "neutral", label: "Withdrawn" };
    case "PENDING":
    default:
      return { tone: "invited", label: "Pending" };
  }
}
