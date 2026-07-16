/**
 * UNPRO — Timezone helpers (Deno / Edge Functions).
 * Mirror of `src/lib/time/timezone.ts`. All user-facing time strings in
 * SMS/email/logs MUST route through this module.
 * Storage stays UTC (`timestamptz`); we only convert at display.
 */

export const APP_TIMEZONE = "America/Toronto";
export const APP_LOCALE = "fr-CA";

function toDate(input: Date | string | number): Date {
  return input instanceof Date ? input : new Date(input);
}

/** "11 h 23 min 55 s" — canonical SMS/short time format. */
export function formatQcTime(input: Date | string | number = new Date()): string {
  const d = toDate(input);
  const parts = new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")} h ${get("minute")} min ${get("second")} s`;
}

/** "2026-07-16 11:23:55" — always Toronto. */
export function formatQcDateTime(input: Date | string | number = new Date()): string {
  const d = toDate(input);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/** "2026-07-16" — date-only in America/Toronto. */
export function formatQcDate(input: Date | string | number = new Date()): string {
  const d = toDate(input);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

/** Structured parts (year, month, day, hour, minute, second, weekday) in America/Toronto. */
export function qcParts(input: Date | string | number = new Date()) {
  const d = toDate(input);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
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
