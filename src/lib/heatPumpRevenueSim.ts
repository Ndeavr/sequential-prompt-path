/**
 * Simulateur « +1 000 000 $ » de /entrepreneurs/thermopompes.
 * Calcul local uniquement, à partir d'hypothèses saisies. Aucun tarif réel :
 * le coût par RDV est une hypothèse (le devis personnalisé est calculé par le serveur).
 */
export const ACTIVATION_FEE = 350;

export interface SimInput {
  objective: number | null;      // CAD HT / an
  avgTicket: number | null;      // CAD HT
  conversionPct: number | null;  // RDV tenus -> vente
  showRatePct: number | null;    // RDV planifiés -> tenus
  weeks: number | null;
  costPerAppointment: number | null; // hypothèse
  monthlySubscription: number | null; // hypothèse
  alreadyActivated: boolean;
}

export const SIM_DEFAULTS: SimInput = {
  objective: 1_000_000, avgTicket: 15_000, conversionPct: 40, showRatePct: 100,
  weeks: 48, costPerAppointment: 200, monthlySubscription: 0, alreadyActivated: false,
};

export const SIM_BOUNDS = {
  objective: [10_000, 10_000_000], avgTicket: [500, 200_000], conversionPct: [0, 100],
  showRatePct: [0, 100], weeks: [1, 52], costPerAppointment: [0, 5_000], monthlySubscription: [0, 50_000],
} as const;

export type SimResult =
  | { ok: false; reason: 'empty' | 'zero_rate' }
  | {
      ok: true; sales: number; heldAppointments: number; plannedAppointments: number;
      monthlyAppointments: number; weeklyAppointments: number; revenue: number;
      appointmentCost: number; subscriptionCost: number; activationCost: number;
      totalCost: number; monthlyAverageCost: number; costPerSale: number; costPctOfRevenue: number;
    };

const r2 = (n: number) => Math.round(n * 100) / 100;
// Évite les erreurs flottantes (ex. 66.99999 -> 67) avant ceil.
const ceil = (n: number) => Math.ceil(Math.round(n * 1e9) / 1e9);

export function clampField(key: keyof typeof SIM_BOUNDS, v: number): number {
  const [lo, hi] = SIM_BOUNDS[key];
  return Math.min(hi, Math.max(lo, v));
}

export function simulate(i: SimInput): SimResult {
  const vals = [i.objective, i.avgTicket, i.conversionPct, i.showRatePct, i.weeks, i.costPerAppointment, i.monthlySubscription];
  if (vals.some(v => v === null || !Number.isFinite(v))) return { ok: false, reason: 'empty' };
  const objective = i.objective!, ticket = i.avgTicket!, conv = i.conversionPct!, show = i.showRatePct!, weeks = i.weeks!;
  if (ticket <= 0 || weeks <= 0 || objective <= 0) return { ok: false, reason: 'empty' };
  if (conv <= 0 || show <= 0) return { ok: false, reason: 'zero_rate' };
  const sales = ceil(objective / ticket);
  const heldAppointments = ceil(sales / (conv / 100));
  const plannedAppointments = ceil(heldAppointments / (show / 100));
  const appointmentCost = plannedAppointments * i.costPerAppointment!;
  const subscriptionCost = i.monthlySubscription! * 12;
  const activationCost = i.alreadyActivated ? 0 : ACTIVATION_FEE;
  const totalCost = appointmentCost + subscriptionCost + activationCost;
  const revenue = sales * ticket;
  return {
    ok: true, sales, heldAppointments, plannedAppointments,
    monthlyAppointments: r2(plannedAppointments / 12),
    weeklyAppointments: r2(plannedAppointments / weeks),
    revenue, appointmentCost, subscriptionCost, activationCost, totalCost,
    monthlyAverageCost: r2(totalCost / 12),
    costPerSale: r2(totalCost / sales),
    costPctOfRevenue: r2((totalCost / revenue) * 100),
  };
}
