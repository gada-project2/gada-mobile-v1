// Money from the API is in kobo (100 kobo = ₦1). Format for display only;
// never send naira back to the API.

/** Convert a Naira amount (user input) to kobo for the API. 5000 -> 500000. */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/** Format an amount in kobo as Naira, e.g. 500000 -> "₦5,000". */
export function formatNaira(kobo: number, opts: { decimals?: boolean } = {}): string {
  const naira = kobo / 100;
  const formatted = naira.toLocaleString("en-NG", {
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  });
  return `₦${formatted}`;
}
