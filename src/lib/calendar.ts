// Pure date math for the calendar grid — no calendar library, no Intl
// (consistent with src/lib/dates.ts). All in the device's local timezone.

export type CalendarView = "month" | "week" | "day";

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Week starts on Sunday (matches WEEKDAY_LABELS). */
export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  return addDays(s, -s.getDay());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** A 6-week (42-day) grid covering the month `anchor` falls in. */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** The 7 days of the week `anchor` falls in. */
export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Inclusive [from, to] ISO range covering the view's visible days. */
export function visibleRange(view: CalendarView, anchor: Date): { dateFrom: string; dateTo: string } {
  let from: Date;
  let to: Date;
  if (view === "month") {
    const grid = monthGrid(anchor);
    from = grid[0];
    to = addDays(grid[grid.length - 1], 1);
  } else if (view === "week") {
    from = startOfWeek(anchor);
    to = addDays(from, 7);
  } else {
    from = startOfDay(anchor);
    to = addDays(from, 1);
  }
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
}

/** Move the anchor by one unit of the current view (sign = direction). */
export function step(view: CalendarView, anchor: Date, dir: 1 | -1): Date {
  if (view === "month") return addMonths(anchor, dir);
  if (view === "week") return addDays(anchor, 7 * dir);
  return addDays(anchor, dir);
}

/** Header title for the current view + anchor, e.g. "March 2026". */
export function viewTitle(view: CalendarView, anchor: Date): string {
  if (view === "day") {
    return `${WEEKDAY_LABELS[anchor.getDay()]}, ${anchor.getDate()} ${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }
  if (view === "week") {
    const days = weekDays(anchor);
    const a = days[0];
    const b = days[6];
    const aLabel = `${a.getDate()} ${MONTHS[a.getMonth()].slice(0, 3)}`;
    const bLabel = `${b.getDate()} ${MONTHS[b.getMonth()].slice(0, 3)}`;
    return `${aLabel} – ${bLabel}`;
  }
  return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
}

/** Bucket events by local day key (YYYY-MM-DD) from their start datetime. */
export function dayKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
