import { tierName } from "../ticket-display";
import { ApiError, apiFetch } from "./client";
import type { Purchase } from "./types";

// The check-in calls NEVER throw to the UI — they always resolve to a result so
// the scanner can render an overlay and keep scanning.
export type CheckInStatus =
  | "checked_in"
  | "already"
  | "invalid"
  | "wrong_event"
  | "error";

export interface CheckInAttendee {
  name: string;
  tier: string;
}

export interface CheckInResult {
  status: CheckInStatus;
  attendee?: CheckInAttendee;
  message: string;
}

type PurchaseEnvelope = { purchase: Purchase } | Purchase;
function unwrap(data: PurchaseEnvelope): Purchase {
  return (data as { purchase?: Purchase }).purchase ?? (data as Purchase);
}

function attendeeOf(p: Purchase): CheckInAttendee {
  return {
    name: p.holderName ?? p.attendeeName ?? "Guest",
    tier: tierName(p),
  };
}

// The API returns a generic 400 for already / wrong-event / invalid-or-expired
// with NO error-code string, so we disambiguate on the message text.
function mapError(err: unknown): CheckInResult {
  if (err instanceof ApiError) {
    const text = `${err.code ?? ""} ${err.message ?? ""}`.toLowerCase();
    if (err.status === 400) {
      if (text.includes("already")) {
        return { status: "already", message: "Already checked in" };
      }
      if (text.includes("belong") || text.includes("different event") || text.includes("wrong event")) {
        return { status: "wrong_event", message: "Ticket is for a different event" };
      }
      return { status: "invalid", message: err.message || "Invalid or expired ticket" };
    }
    if (err.status === 404) {
      return { status: "invalid", message: "Ticket not found" };
    }
    if (err.status === 401 || err.status === 403) {
      return { status: "error", message: "You're not allowed to check in for this event" };
    }
    return { status: "error", message: err.message || "Check-in failed" };
  }
  return { status: "error", message: "Network error — try again" };
}

function success(p: Purchase): CheckInResult {
  const attendee = attendeeOf(p);
  return { status: "checked_in", attendee, message: `Checked in — ${attendee.name}` };
}

/** Check in by the signed QR token scanned from a ticket. */
export async function checkInByQr(gadaringId: string, qrToken: string): Promise<CheckInResult> {
  try {
    const data = await apiFetch<PurchaseEnvelope>(`/events/${gadaringId}/checkin/qr`, {
      method: "POST",
      body: { qrToken },
    });
    return success(unwrap(data));
  } catch (err) {
    return mapError(err);
  }
}

/** Check in by an internal purchase id (manual fallback). */
export async function checkInByPurchaseId(
  gadaringId: string,
  purchaseId: string,
): Promise<CheckInResult> {
  try {
    const data = await apiFetch<PurchaseEnvelope>(`/events/${gadaringId}/checkin`, {
      method: "POST",
      body: { purchaseId },
    });
    return success(unwrap(data));
  } catch (err) {
    return mapError(err);
  }
}
