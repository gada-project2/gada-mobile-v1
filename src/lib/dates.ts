// Lightweight date formatting (no Intl dependency — robust on Hermes).
// Renders in the device's local timezone, which is what attendees expect.

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function parse(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function time(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

/** "Sat, 21 Mar" */
export function formatEventDay(iso?: string): string {
  const d = parse(iso);
  if (!d) return "";
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Sat, 21 Mar · 7:00 PM" */
export function formatEventDate(iso?: string): string {
  const d = parse(iso);
  if (!d) return "";
  return `${formatEventDay(iso)} · ${time(d)}`;
}

/** Range like "Sat, 21 Mar · 7:00 PM – 11:00 PM" (same day) or with end day. */
export function formatEventRange(startIso?: string, endIso?: string): string {
  const start = parse(startIso);
  if (!start) return "";
  const end = parse(endIso);
  if (!end) return formatEventDate(startIso);

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) return `${formatEventDate(startIso)} – ${time(end)}`;
  return `${formatEventDate(startIso)} – ${formatEventDate(endIso)}`;
}
