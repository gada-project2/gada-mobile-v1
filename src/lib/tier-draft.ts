import type { CreateTicketDto, TicketType } from "./api/types";
import { nairaToKobo } from "./money";

// Editable draft for a ticket tier. Price is collected in NAIRA (string input)
// and converted to kobo only when building the DTO — never send naira.
export interface DraftTier {
  name: string;
  type: TicketType;
  isFree: boolean;
  priceNaira: string;
  quantity: string;
  perks: string; // comma-separated
  description: string;
}

export const TIER_TYPES: TicketType[] = ["REGULAR", "VIP", "TABLE"];

export function emptyTier(): DraftTier {
  return {
    name: "",
    type: "REGULAR",
    isFree: true,
    priceNaira: "",
    quantity: "",
    perks: "",
    description: "",
  };
}

export function validateTier(t: DraftTier): string | null {
  if (!t.name.trim()) return "Give the tier a name.";
  const qty = Number(t.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return "Quantity must be at least 1.";
  if (!t.isFree) {
    const price = Number(t.priceNaira);
    if (!Number.isFinite(price) || price <= 0) return "Enter a price, or mark the tier free.";
  }
  return null;
}

export function tierToDto(t: DraftTier): CreateTicketDto {
  const perks = t.perks
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    name: t.name.trim(),
    type: t.type,
    priceKobo: t.isFree ? 0 : nairaToKobo(Number(t.priceNaira) || 0),
    quantity: Number(t.quantity) || 0,
    perks: perks.length ? perks : undefined,
    description: t.description.trim() || undefined,
  };
}
