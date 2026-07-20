/** Minimal className joiner (filters falsy values). Later classes win in NativeWind. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
