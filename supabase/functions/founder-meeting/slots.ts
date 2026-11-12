/**
 * Pure slot rules for founder meetings (no I/O; also imported by Vitest).
 * 90 min, Monday–Friday, starts 10:00 / 11:30 / 13:00 America/Toronto (end ≤ 15:00),
 * at least 24 h ahead, DST-safe wall-time conversion.
 */
export const TZ = "America/Toronto";
export const DURATION_MIN = 90;
export const STARTS = ["10:00", "11:30", "13:00"] as const;
export const MIN_LEAD_HOURS = 24;
export const HORIZON_DAYS = 30;

export interface Slot { start: string; end: string }
export interface Busy { start: string; end: string }

function parts(ms: number) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: g("year"), m: g("month"), d: g("day"), h: g("hour"), min: g("minute"), s: g("second") };
}
function offset(ms: number) {
  const p = parts(ms);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000;
}
export function wallToUtc(y: number, m: number, d: number, h: number, min: number): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const first = guess - offset(guess);
  return guess - offset(first);
}

/** All candidate slots from now+24h up to the horizon, chronological. */
export function candidateSlots(now: Date, horizonDays = HORIZON_DAYS): Slot[] {
  const minStart = now.getTime() + MIN_LEAD_HOURS * 3600_000;
  const t = parts(now.getTime());
  const out: Slot[] = [];
  for (let i = 0; i <= horizonDays; i++) {
    const cal = new Date(Date.UTC(t.y, t.m - 1, t.d + i));
    const dow = cal.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    for (const hm of STARTS) {
      const [h, mi] = hm.split(":").map(Number);
      const s = wallToUtc(cal.getUTCFullYear(), cal.getUTCMonth() + 1, cal.getUTCDate(), h, mi);
      if (s >= minStart) out.push({ start: new Date(s).toISOString(), end: new Date(s + DURATION_MIN * 60_000).toISOString() });
    }
  }
  return out;
}

export function overlaps(slot: Slot, busy: Busy): boolean {
  return Date.parse(slot.start) < Date.parse(busy.end) && Date.parse(slot.end) > Date.parse(busy.start);
}

/** First `count` candidate slots that overlap no busy window (Google busy + held UNPRO meetings). */
export function pickFreeSlots(now: Date, busy: Busy[], count = 3, horizonDays = HORIZON_DAYS): Slot[] {
  return candidateSlots(now, horizonDays).filter((s) => !busy.some((b) => overlaps(s, b))).slice(0, count);
}

/** True only for an exact rule-compliant candidate start still ≥ 24 h ahead. */
export function isValidCandidate(startIso: string, now: Date): Slot | null {
  const s = Date.parse(startIso);
  if (!Number.isFinite(s)) return null;
  const iso = new Date(s).toISOString();
  return candidateSlots(now).find((c) => c.start === iso) ?? null;
}
