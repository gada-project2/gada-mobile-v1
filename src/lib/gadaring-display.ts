import type { Gadaring } from "./api/types";
import { formatNaira } from "./money";

/** Live = happening now. Coral "Live now" treatment is reserved for this only. */
export function isLive(g: Pick<Gadaring, "status">): boolean {
  return g.status === "ONGOING";
}

export function goingCount(g: Pick<Gadaring, "ticketsSold">): number {
  return g.ticketsSold ?? 0;
}

export function isFreeEvent(
  g: Pick<Gadaring, "isFree" | "lowestPriceKobo">,
): boolean {
  if (typeof g.isFree === "boolean") return g.isFree;
  return (g.lowestPriceKobo ?? 0) <= 0;
}

/** "Free", "From ₦5,000", or "Paid" when no price is exposed. */
export function priceLabel(
  g: Pick<Gadaring, "isFree" | "lowestPriceKobo">,
): string {
  if (isFreeEvent(g)) return "Free";
  if (g.lowestPriceKobo && g.lowestPriceKobo > 0) return `From ${formatNaira(g.lowestPriceKobo)}`;
  return "Paid";
}
