/**
 * UNPRO — Horaires PROPOSÉS pour une rencontre avec le fondateur (/commission).
 * Ce ne sont PAS des disponibilités vérifiées : aucune lecture d'agenda n'est faite ici.
 * Règles : 90 min, lundi–vendredi, débuts 10:00 / 11:30 / 13:00 (fin 14:30 < 15:00),
 * heure de Montréal (America/Toronto), conversion exacte même aux changements d'heure.
 */
export const FOUNDER_MEETING_TZ = "America/Toronto";
export const FOUNDER_MEETING_DURATION_MIN = 90;
export const FOUNDER_MEETING_WINDOW = { startMin: 10 * 60, endMin: 15 * 60 } as const;
export const FOUNDER_MEETING_STARTS = ["10:00", "11:30", "13:00"] as const;
/** Délai minimal avant un horaire proposé, pour laisser le temps de confirmer. */
export const FOUNDER_MEETING_MIN_LEAD_HOURS = 24;

export interface ProposedSlot {
  /** Début en UTC (ISO 8601). */
  startIso: string;
  endIso: string;
  /** Date locale à Montréal (YYYY-MM-DD). */
  localDate: string;
  /** Heure locale de début (HH:MM). */
  localStart: string;
}

export interface ProposedDay {
  localDate: string;
  slots: ProposedSlot[];
}

function localParts(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: g("year"), m: g("month"), d: g("day"), h: g("hour"), min: g("minute"), s: g("second") };
}

function offsetMs(ms: number, tz: string) {
  const p = localParts(ms, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000;
}

/** Instant UTC d'une heure murale locale (fuseau tz). */
export function zonedWallTimeToUtc(y: number, m: number, d: number, h: number, min: number, tz = FOUNDER_MEETING_TZ): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  let ms = guess - offsetMs(guess, tz);
  const second = guess - offsetMs(ms, tz);
  if (second !== ms) ms = second;
  return ms;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Prochains jours ouvrables avec leurs 3 horaires proposés.
 * Un jour n'est retenu que si ses 3 horaires respectent le délai minimal.
 */
export function proposeFounderMeetingDays(now: Date, days = 5, tz = FOUNDER_MEETING_TZ, minLeadHours = FOUNDER_MEETING_MIN_LEAD_HOURS): ProposedDay[] {
  const minStart = now.getTime() + minLeadHours * 3600_000;
  const today = localParts(now.getTime(), tz);
  const out: ProposedDay[] = [];
  for (let i = 0; out.length < days && i < 60; i++) {
    const cal = new Date(Date.UTC(today.y, today.m - 1, today.d + i));
    const dow = cal.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const y = cal.getUTCFullYear(), m = cal.getUTCMonth() + 1, d = cal.getUTCDate();
    const localDate = `${y}-${pad(m)}-${pad(d)}`;
    const slots = FOUNDER_MEETING_STARTS.map((hm) => {
      const [h, mi] = hm.split(":").map(Number);
      const start = zonedWallTimeToUtc(y, m, d, h, mi, tz);
      return { startIso: new Date(start).toISOString(), endIso: new Date(start + FOUNDER_MEETING_DURATION_MIN * 60_000).toISOString(), localDate, localStart: hm };
    });
    if (slots.every((s) => Date.parse(s.startIso) >= minStart)) out.push({ localDate, slots });
  }
  return out;
}

/** Un horaire proposé reste valide s'il correspond aux règles et respecte encore le délai minimal. */
export function isProposedSlotStillValid(slot: ProposedSlot, now: Date, tz = FOUNDER_MEETING_TZ, minLeadHours = FOUNDER_MEETING_MIN_LEAD_HOURS): boolean {
  const start = Date.parse(slot.startIso);
  if (!Number.isFinite(start) || start < now.getTime() + minLeadHours * 3600_000) return false;
  if (Date.parse(slot.endIso) - start !== FOUNDER_MEETING_DURATION_MIN * 60_000) return false;
  const p = localParts(start, tz);
  const startMin = p.h * 60 + p.min;
  const dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  return dow !== 0 && dow !== 6
    && FOUNDER_MEETING_STARTS.includes(`${pad(p.h)}:${pad(p.min)}` as (typeof FOUNDER_MEETING_STARTS)[number])
    && startMin >= FOUNDER_MEETING_WINDOW.startMin
    && startMin + FOUNDER_MEETING_DURATION_MIN <= FOUNDER_MEETING_WINDOW.endMin;
}

type Lang = "fr" | "en";

function zoneAbbr(ms: number, lang: Lang, tz: string) {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(new Date(ms)).find((p) => p.type === "timeZoneName")?.value ?? "";
}

export function formatDayLabel(localDate: string, lang: Lang, tz = FOUNDER_MEETING_TZ): string {
  const [y, m, d] = localDate.split("-").map(Number);
  const noon = zonedWallTimeToUtc(y, m, d, 12, 0, tz);
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(new Date(noon));
}

export function formatSlotTime(slot: ProposedSlot, lang: Lang, tz = FOUNDER_MEETING_TZ): string {
  const f = new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", lang === "fr"
    ? { timeZone: tz, hour: "2-digit", minute: "2-digit" }
    : { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const s = Date.parse(slot.startIso), e = Date.parse(slot.endIso);
  return lang === "fr"
    ? `${f.format(new Date(s))} à ${f.format(new Date(e))} (${zoneAbbr(s, lang, tz)})`
    : `${f.format(new Date(s))} to ${f.format(new Date(e))} (${zoneAbbr(s, lang, tz)})`;
}

/** Libellé complet, utilisé dans la demande enregistrée. */
export function formatSlotFull(slot: ProposedSlot, lang: Lang, tz = FOUNDER_MEETING_TZ): string {
  return `${formatDayLabel(slot.localDate, lang, tz)}, ${formatSlotTime(slot, lang, tz)}`;
}
