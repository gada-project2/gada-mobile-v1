// Tiny module-level bridge so anything (e.g. the sphere "My calendar" tile) can
// open the ONE CalendarOverlay that's mounted at the app shell. The overlay
// registers its open() action; callers invoke openCalendar(). This avoids a
// second calendar and keeps the right-edge swipe and the tile in sync.

let opener: (() => void) | null = null;

export function registerCalendarOpener(fn: (() => void) | null): void {
  opener = fn;
}

/** Open the shared calendar overlay (no-op if it isn't mounted). */
export function openCalendar(): void {
  opener?.();
}
