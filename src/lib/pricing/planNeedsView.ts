/**
 * Rendez-vous NÉCESSAIRES (scénario déclaré) vs rendez-vous INCLUS (entente).
 * Jamais un nombre inclus, une promesse ni un taux de fermeture garanti.
 */
export interface AppointmentNeeds { contractsPerMonth: number; closeRatePct: number; needed: number }

export function appointmentsNeeded(contractsPerMonth: unknown, closeRate: unknown): AppointmentNeeds | null {
  const c = Number(contractsPerMonth);
  const r = Number(closeRate);
  if (!Number.isFinite(c) || c <= 0 || !Number.isFinite(r) || r <= 0 || r > 1) return null;
  // Tolérance flottante : 4 / 0,4 = 10 (et non 11); 7 / 0,4 = 17,5 → 18.
  const needed = Math.ceil(c / r - 1e-9);
  return { contractsPerMonth: Math.round(c * 100) / 100, closeRatePct: Math.round(r * 1000) / 10, needed };
}

export function needsFromExplanation(pe: unknown): AppointmentNeeds | null {
  const rec = (pe as { appointment_recommendation?: { contracts_per_month?: unknown; close_rate?: unknown } } | null | undefined)?.appointment_recommendation;
  return rec ? appointmentsNeeded(rec.contracts_per_month, rec.close_rate) : null;
}
