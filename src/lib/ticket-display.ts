import type { PaymentStatus, Purchase } from "./api/types";

export interface ResolvedQr {
  kind: "image" | "token" | "none";
  value: string;
}

/**
 * Resolve whatever QR representation the API returned — we RENDER it, never
 * generate our own. Prefers an image (data-URL or https), else falls back to a
 * raw token string shown for the gate to scan.
 */
export function resolveQr(p: Purchase): ResolvedQr {
  const imageCandidates = [p.qrImageUrl, p.qrImage, p.qrUrl, p.qrCode, p.qr];
  for (const c of imageCandidates) {
    if (c && (c.startsWith("data:image") || /^https?:\/\//.test(c))) {
      return { kind: "image", value: c };
    }
  }
  const token = p.qrToken ?? p.qrCode ?? p.qr;
  if (token) return { kind: "token", value: token };
  return { kind: "none", value: "" };
}

/** Event summary, whether the API returns it flat or nested under `gadaring`. */
export function purchaseEvent(p: Purchase): {
  id?: string;
  name: string;
  startDate?: string;
  venue?: string;
} {
  const g = p.gadaring;
  return {
    id: p.gadaringId ?? g?.id,
    name: p.name ?? g?.name ?? "Event",
    startDate: p.startDate ?? g?.startDate,
    venue: p.venue ?? g?.venue,
  };
}

export function purchaseKey(p: Purchase): string {
  return p.purchaseId ?? p.id;
}

export function tierName(p: Purchase): string {
  return p.ticketName ?? p.ticketType ?? "Ticket";
}

export function isCheckedIn(p: Purchase): boolean {
  return p.checkedIn === true || p.status === "CHECKED_IN" || !!p.checkedInAt;
}

type PillTone = "brand" | "coral" | "neutral" | "invited";

export function paymentStatusTone(status: PaymentStatus): PillTone {
  switch (status) {
    case "SUCCESS":
      return "brand";
    case "FAILED":
      return "coral";
    case "REFUNDED":
      return "neutral";
    default:
      return "invited"; // PENDING
  }
}

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "SUCCESS":
      return "Paid";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    default:
      return "Pending";
  }
}
