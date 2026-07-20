import { apiFetch } from "./client";
import type {
  PaidInitResponse,
  PaymentRecord,
  PaymentVerification,
  Purchase,
} from "./types";

export type MyTicketsTab = "upcoming" | "past";

// The free-purchase + detail endpoints may return the purchase nested under
// `purchase` or flat — tolerate both.
type PurchaseEnvelope = { purchase: Purchase } | Purchase;
function unwrapPurchase(data: PurchaseEnvelope): Purchase {
  return (data as { purchase?: Purchase }).purchase ?? (data as Purchase);
}

function purchaseBody(quantity: number, holderName?: string): Record<string, unknown> {
  // DTO confirmed: { quantity (min 1) }. holderName is sent only if provided
  // (kept in the signature for later; the API currently ignores extras).
  return holderName ? { quantity, holderName } : { quantity };
}

/** Free ticket → returns the created Purchase (navigate to its QR). */
export async function purchaseFree(
  gadaringId: string,
  ticketId: string,
  quantity = 1,
  holderName?: string,
): Promise<Purchase> {
  const data = await apiFetch<PurchaseEnvelope>(
    `/events/${gadaringId}/tickets/${ticketId}/purchase`,
    { method: "POST", body: purchaseBody(quantity, holderName) },
  );
  return unwrapPurchase(data);
}

/** Paid ticket → returns the gateway paymentUrl + reference to open + verify. */
export function initiatePaidPurchase(
  gadaringId: string,
  ticketId: string,
  quantity = 1,
  holderName?: string,
): Promise<PaidInitResponse> {
  return apiFetch<PaidInitResponse>(
    `/events/${gadaringId}/tickets/${ticketId}/purchase/paid`,
    { method: "POST", body: purchaseBody(quantity, holderName) },
  );
}

export function getMyTickets(tab: MyTicketsTab): Promise<Purchase[]> {
  return apiFetch<Purchase[]>(`/tickets/my?tab=${tab}`);
}

export async function getTicket(purchaseId: string): Promise<Purchase> {
  const data = await apiFetch<PurchaseEnvelope>(`/tickets/${purchaseId}`);
  return unwrapPurchase(data);
}

export function getPaymentHistory(): Promise<PaymentRecord[]> {
  return apiFetch<PaymentRecord[]>(`/payments/history`);
}

/** Poll target during paid checkout. The webhook is the source of truth. */
export function verifyPayment(reference: string): Promise<PaymentVerification> {
  return apiFetch<PaymentVerification>(`/payments/verify/${reference}`);
}
