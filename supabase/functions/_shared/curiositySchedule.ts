// Mapping step -> day offset (depuis l'enrôlement, J0).
// Cadence demandée: J1, J2, J3, J4, J5, J7, J7, J7, J10, J10, J10, J12.
// (Le tick envoie au plus 1 SMS par séquence par cycle pour préserver l'effet "respiration",
//  mais regroupe quand la même date contient plusieurs steps en avançant next_send_at.)
export const CURIOSITY_DAY_OFFSETS: Record<number, number> = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
  6: 7, 7: 7, 8: 7,
  9: 10, 10: 10, 11: 10,
  12: 12,
};

export const TOTAL_STEPS = 12;

export function templateKeyForStep(step: number): string {
  return `curiosity_${String(step).padStart(2, "0")}`;
}

export function nextSendDate(enrollmentDate: Date, nextStep: number): Date {
  const offset = CURIOSITY_DAY_OFFSETS[nextStep];
  if (!offset) return new Date(8640000000000000); // sentinel
  const d = new Date(enrollmentDate);
  d.setUTCDate(d.getUTCDate() + offset);
  d.setUTCHours(14, 0, 0, 0); // 10h Montréal (EDT) / 9h (EST) — borné par fenêtre côté tick
  return d;
}

// Commercial curiosity outreach: weekdays 09:00–17:00 America/Toronto only.
// Transactional messages use a separate path, not this commercial scheduler.
export function isWithinSendWindow(now: Date): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto", weekday: "short", hour: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "", 10);
  return weekday !== "Sat" && weekday !== "Sun" && hour >= 9 && hour < 17;
}

export function nextWindowOpening(now: Date): Date {
  // Avance à la prochaine heure ouvrable autorisée, y compris après un vendredi 17 h.
  const out = new Date(now);
  for (let i = 0; i < 7 * 24 + 2; i++) {
    out.setUTCMinutes(0, 0, 0);
    out.setUTCHours(out.getUTCHours() + 1);
    if (isWithinSendWindow(out)) return out;
  }
  return out;
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}
