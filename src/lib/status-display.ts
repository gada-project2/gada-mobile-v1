type PillTone = "brand" | "coral" | "neutral" | "invited" | "volunteering";

// Status pill for a gadaring. Draft is intentionally neutral/grey so it reads
// clearly distinct from a live (coral) event.
export function statusPill(status: string): { tone: PillTone; label: string } {
  switch (status) {
    case "DRAFT":
      return { tone: "neutral", label: "Draft" };
    case "PUBLISHED":
      return { tone: "brand", label: "Upcoming" };
    case "ONGOING":
      return { tone: "coral", label: "Live now" };
    case "COMPLETED":
      return { tone: "neutral", label: "Ended" };
    case "CANCELLED":
      return { tone: "neutral", label: "Cancelled" };
    default:
      return { tone: "neutral", label: status };
  }
}

// Admin moderation pill — only shown when not approved (publish sets PENDING).
export function adminPill(adminStatus?: string): { tone: PillTone; label: string } | null {
  switch (adminStatus) {
    case "PENDING":
      return { tone: "invited", label: "Pending approval" };
    case "REJECTED":
      return { tone: "coral", label: "Rejected" };
    default:
      return null;
  }
}
