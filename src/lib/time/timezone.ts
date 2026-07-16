/**
 * UNPRO — Timezone helpers (frontend).
 * Single source of truth for user-facing time formatting.
 * Storage stays in UTC (timestamptz); ONLY convert here at display time.
 */

export const UNPRO_TIMEZONE = "America/Toronto";
export const UNPRO_LOCALE = "fr-CA";

function toDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

/** "11 h 23 min 55 s" — for SMS bodies / short user-facing time strings. */
export function formatQcTime(input: Date | string | number = new Date()): string {
  const d = toDate(input);
  const parts = new Intl.DateTimeFormat(UNPRO_LOCALE, {
    timeZone: UNPRO_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")} h ${get("minute")} min ${get("second")} s`;
}

/** "2026-07-16" */
export function formatQcDate(input: Date | string | number = new Date()): string {
  const d = toDate(input);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: UNPRO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** "2026-07-16 11:23:55" — ISO-like, always Toronto. */
export function formatQcDateTime(input: Date | string | number = new Date()): string {
  const d = toDate(input);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: UNPRO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/** Human-friendly "16 juillet 2026 à 11 h 23" */
export function formatQcLong(input: Date | string | number = new Date()): string {
  const d = toDate(input);
  return new Intl.DateTimeFormat(UNPRO_LOCALE, {
    timeZone: UNPRO_TIMEZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(d);
}

/** Structured parts of `now` in America/Toronto — for business logic (send windows, etc.). */
export function nowInQc(input: Date | string | number = new Date()): {
  year: number; month: number; day: number;
  hour: number; minute: number; second: number;
  weekday: number; // 0=Sun..6=Sat
} {
  const d = toDate(input);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: UNPRO_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    weekday: "short", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(get("year"), 10) || 0,
    month: parseInt(get("month"), 10) || 0,
    day: parseInt(get("day"), 10) || 0,
    hour: parseInt(get("hour"), 10) || 0,
    minute: parseInt(get("minute"), 10) || 0,
    second: parseInt(get("second"), 10) || 0,
    weekday: wdMap[get("weekday")] ?? 0,
  };
}
