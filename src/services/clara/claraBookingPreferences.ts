/**
 * Clara — reads a contractor's own description of how they like their
 * appointments (typed or dictated, FR-QC) and turns it into DECLARED rules.
 * Deterministic: only what is explicitly said is extracted; nothing is
 * assumed (no representative count, no travel time, no default evening cap).
 */

export interface DayHoursChange {
  start?: string; // "HH:MM"
  end?: string;
  closed?: boolean;
}

export interface ParsedBookingPreferences {
  hours: Partial<Record<number, DayHoursChange>>;
  maxEveningsPerWeek: number | null;
  preferCompactSchedule: boolean;
  representatives: number | null;
}

const DAY_WORDS: Array<[RegExp, number[]]> = [
  [/\bfins? de semaine\b|\bweek-?ends?\b/, [6, 0]],
  [/\ben semaine\b|\bla semaine\b|\bjours? de semaine\b/, [1, 2, 3, 4, 5]],
  [/\blundi\b|\blun\b/, [1]],
  [/\bmardi\b|\bmar\b/, [2]],
  [/\bmercredi\b|\bmer\b/, [3]],
  [/\bjeudi\b|\bjeu\b/, [4]],
  [/\bvendredi\b|\bven\b/, [5]],
  [/\bsamedi\b|\bsam\b/, [6]],
  [/\bdimanche\b|\bdim\b/, [0]],
];

const NUMBER_WORDS: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7 };
const toNumber = (v: string) => (/^\d+$/.test(v) ? Number(v) : NUMBER_WORDS[v] ?? NaN);

const normalize = (text: string) =>
  text.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

const time = (h: string, m?: string) => {
  const hour = Number(h);
  const min = m ? Number(m) : 0;
  if (!Number.isFinite(hour) || hour > 23 || min > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

const TIME = String.raw`(\d{1,2})\s*(?:h|:)\s*(\d{2})?`;

function daysIn(clause: string): number[] {
  // Range "lundi au jeudi" / "du lundi au jeudi"
  const names = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const range = clause.match(/(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s*(?:au|à|-|–)\s*(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/);
  if (range) {
    const a = names.indexOf(range[1]);
    const b = names.indexOf(range[2]);
    const out: number[] = [];
    for (let d = a; ; d = (d + 1) % 7) { out.push(d); if (d === b || out.length > 7) break; }
    return out;
  }
  const out = new Set<number>();
  for (const [re, days] of DAY_WORDS) if (re.test(clause)) days.forEach((d) => out.add(d));
  return [...out];
}

function hoursIn(clause: string, defaultKind: "end" | "start" | null): DayHoursChange | null {
  if (/\bferm[ée]e?s?(?![a-zà-ÿ])|\bcongé(?![a-zà-ÿ])|\bpas de (?:visite|rendez-vous)\b/.test(clause)) return { closed: true };
  const range = clause.match(new RegExp(`${TIME}\\s*(?:à|a|-|–|au)\\s*${TIME}`));
  if (range) {
    const start = time(range[1], range[2]);
    const end = time(range[3], range[4]);
    return start && end ? { start, end } : null;
  }
  const end = clause.match(new RegExp(`(?:au plus tard|jusqu'à|jusqu'a|terminent?|finissent?|finir|fin)[^\\d]{0,20}${TIME}`));
  if (end) { const e = time(end[1], end[2]); return e ? { end: e } : null; }
  const start = clause.match(new RegExp(`(?:à partir de|dès|commencent?|début)[^\\d]{0,12}${TIME}`));
  if (start) { const s = time(start[1], start[2]); return s ? { start: s } : null; }
  const bare = clause.match(new RegExp(TIME));
  if (bare && defaultKind) { const t = time(bare[1], bare[2]); return t ? { [defaultKind]: t } : null; }
  return null;
}

export function parseBookingPreferences(input: string): ParsedBookingPreferences {
  let text = normalize(input);
  const result: ParsedBookingPreferences = { hours: {}, maxEveningsPerWeek: null, preferCompactSchedule: false, representatives: null };

  const evenings = text.match(/(?:max(?:imum)?|au plus|pas plus de|jusqu'à)\s*(\d|un|une|deux|trois|quatre|cinq|six|sept)\s*(?:soirs?|soirées?)(?:\s*par semaine)?/);
  if (evenings) {
    const n = toNumber(evenings[1]);
    if (Number.isFinite(n) && n >= 0 && n <= 7) result.maxEveningsPerWeek = n;
    text = text.replace(evenings[0], " ");
  }

  if (/moins de (?:temps )?(?:vide|trous?|temps mort)|regroup|coll[ée]s|enchaîn|enchain|back.to.back|sans trou/.test(text)) {
    result.preferCompactSchedule = true;
  }

  const reps = text.match(/(\d+|un|une|deux|trois|quatre|cinq|six|sept)\s*(?:représentants?|representants?|estimateurs?|inspecteurs?|employés?)/);
  if (reps) { const n = toNumber(reps[1]); if (Number.isFinite(n) && n >= 1) result.representatives = n; }
  else if (/\b(?:je suis seul|seul représentant|un seul représentant|juste moi)\b/.test(text)) result.representatives = 1;

  const set = (days: number[], change: DayHoursChange) => {
    for (const d of days) result.hours[d] = { ...(result.hours[d] ?? {}), ...change };
  };

  for (const sentence of text.split(/[.;\n]+/)) {
    const [main, ...exceptions] = sentence.split(/\bsauf\b|\bexcepté\b|\bmais\b/);
    const mainDays = daysIn(main);
    const mainHours = hoursIn(main, null);
    const kind: "end" | "start" | null = mainHours?.end && !mainHours.start ? "end" : mainHours?.start && !mainHours.end ? "start" : "end";
    const excluded = new Set<number>();
    for (const ex of exceptions) {
      const exDays = daysIn(ex);
      const exHours = hoursIn(ex, kind);
      exDays.forEach((d) => excluded.add(d));
      if (exDays.length && exHours) set(exDays, exHours);
    }
    if (mainDays.length && mainHours) set(mainDays.filter((d) => !excluded.has(d)), mainHours);
  }
  return result;
}

const DAY_SHORT = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const fmt = (t: string) => t.replace(/^0/, "").replace(":00", " h").replace(":", " h ");

function groupDays(days: number[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const sorted = order.filter((d) => days.includes(d));
  const idx = sorted.map((d) => order.indexOf(d));
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (sorted.length > 2 && contiguous) return `${DAY_SHORT[sorted[0]]}–${DAY_SHORT[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => DAY_SHORT[d]).join(", ");
}

/** Clara's short recap, one line per understood rule. Empty array = nothing understood. */
export function summarizeBookingPreferences(p: ParsedBookingPreferences, eveningAfter = "19:00"): string[] {
  const lines: string[] = [];
  const buckets = new Map<string, number[]>();
  for (const [day, change] of Object.entries(p.hours)) {
    if (!change) continue;
    const key = change.closed
      ? "Fermé"
      : change.start && change.end
        ? `${fmt(change.start)} à ${fmt(change.end)}`
        : change.end
          ? `fin au plus tard ${fmt(change.end)}`
          : `à partir de ${fmt(change.start!)}`;
    buckets.set(key, [...(buckets.get(key) ?? []), Number(day)]);
  }
  for (const [label, days] of buckets) lines.push(`${groupDays(days)} : ${label}`);
  if (p.maxEveningsPerWeek !== null) {
    lines.push(`Au plus ${p.maxEveningsPerWeek} soirée${p.maxEveningsPerWeek > 1 ? "s" : ""} par semaine (visite finissant après ${fmt(eveningAfter)})`);
  }
  if (p.preferCompactSchedule) lines.push("Rendez-vous regroupés pour limiter les temps morts");
  if (p.representatives !== null) lines.push(`${p.representatives} représentant${p.representatives > 1 ? "s" : ""} pour les visites`);
  return lines;
}

export interface AvailabilityRow { day_of_week: number; start_time: string; end_time: string; is_active: boolean }

/** Applies declared hour changes onto the weekly form; untouched days stay as they are. */
export function applyHoursToAvailability(rows: AvailabilityRow[], hours: ParsedBookingPreferences["hours"]): AvailabilityRow[] {
  const byDay = new Map(rows.map((r) => [r.day_of_week, { ...r }]));
  for (const [dayStr, change] of Object.entries(hours)) {
    if (!change) continue;
    const day = Number(dayStr);
    const current = byDay.get(day);
    if (change.closed) {
      if (current) byDay.set(day, { ...current, is_active: false });
      continue;
    }
    const start = change.start ?? current?.start_time?.slice(0, 5);
    const end = change.end ?? current?.end_time?.slice(0, 5);
    if (!start || !end || start >= end) continue; // never invent the missing bound
    byDay.set(day, { day_of_week: day, start_time: start, end_time: end, is_active: true });
  }
  return [...byDay.values()].sort((a, b) => a.day_of_week - b.day_of_week);
}
