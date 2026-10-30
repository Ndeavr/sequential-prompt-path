/**
 * Continuité simulateur thermopompes → plan personnalisé.
 * Hypothèses DÉCLARÉES uniquement : jamais un prix serveur, un droit d'activation
 * ou une preuve de paiement. Validation stricte, contexte invalide ignoré.
 */
import { SIM_BOUNDS, simulate, type SimInput } from './heatPumpRevenueSim';
import { heatPumpTypes, type HeatPumpPreferences, type HeatPumpPreference } from './heatPumpDemo';

export const SIM_HANDOFF_KEY = 'unpro_heatpump_sim_handoff_v1';
export const SIM_STATE_KEY = 'unpro_heatpump_sim_state_v1';
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;
const PREFS: HeatPumpPreference[] = ['priority', 'accepted', 'excluded'];

export interface SimHandoff {
  objective: number; avgTicket: number; conversionPct: number; showRatePct: number; weeks: number;
  costPerAppointment: number; monthlySubscription: number; alreadyActivatedDeclared: boolean;
  sales: number; heldAppointments: number; plannedAppointments: number; monthlyAppointments: number;
  preferences: HeatPumpPreferences | null; createdAt: number;
}

type NumKey = keyof typeof SIM_BOUNDS;
const PARAM: Record<NumKey, string> = {
  objective: 'sim_objectif', avgTicket: 'sim_panier', conversionPct: 'sim_conversion', showRatePct: 'sim_presence',
  weeks: 'sim_semaines', costPerAppointment: 'sim_cout_rdv', monthlySubscription: 'sim_abonnement',
};
const strictNum = (v: unknown, k: NumKey): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d{1,9}(\.\d{1,2})?$/.test(v) ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  const [lo, hi] = SIM_BOUNDS[k];
  return n < lo || n > hi ? null : n;
};

/** Construit le contexte à partir des valeurs ACTUELLES; null si non calculable. */
export function buildHandoff(input: SimInput, preferences: HeatPumpPreferences | null, now = Date.now()): SimHandoff | null {
  const res = simulate(input);
  if (!res.ok) return null;
  return {
    objective: input.objective!, avgTicket: input.avgTicket!, conversionPct: input.conversionPct!, showRatePct: input.showRatePct!,
    weeks: input.weeks!, costPerAppointment: input.costPerAppointment!, monthlySubscription: input.monthlySubscription!,
    alreadyActivatedDeclared: input.alreadyActivated, sales: res.sales, heldAppointments: res.heldAppointments,
    plannedAppointments: res.plannedAppointments, monthlyAppointments: res.monthlyAppointments, preferences, createdAt: now,
  };
}

export function handoffToParams(h: SimHandoff, qs: URLSearchParams): URLSearchParams {
  (Object.keys(PARAM) as NumKey[]).forEach(k => qs.set(PARAM[k], String(h[k])));
  qs.set('sim_active', h.alreadyActivatedDeclared ? '1' : '0');
  if (h.preferences) qs.set('sim_prefs', heatPumpTypes.map(t => `${t}:${h.preferences![t]}`).join(','));
  qs.set('sim_ts', String(h.createdAt));
  return qs;
}

function parsePrefs(v: unknown): HeatPumpPreferences | null {
  if (typeof v === 'object' && v) {
    const o = v as Record<string, unknown>;
    return heatPumpTypes.every(t => PREFS.includes(o[t] as HeatPumpPreference)) ? (Object.fromEntries(heatPumpTypes.map(t => [t, o[t]])) as HeatPumpPreferences) : null;
  }
  if (typeof v !== 'string' || v.length > 80) return null;
  const o: Record<string, string> = {};
  for (const part of v.split(',')) { const [a, b] = part.split(':'); o[a] = b; }
  return parsePrefs(o);
}

/** Reconstruit et RECALCULE le contexte; les valeurs calculées transmises ne sont jamais crues. */
function fromRaw(get: (k: string) => unknown, now: number): SimHandoff | null {
  const vals = {} as Record<NumKey, number>;
  for (const k of Object.keys(PARAM) as NumKey[]) { const n = strictNum(get(PARAM[k]), k); if (n === null) return null; vals[k] = n; }
  const act = get('sim_active');
  const ts = Number(get('sim_ts'));
  const createdAt = Number.isFinite(ts) && ts > 0 && ts <= now + 60_000 && now - ts < MAX_AGE_MS ? ts : null;
  if (createdAt === null) return null;
  return buildHandoff({ ...vals, alreadyActivated: act === '1' || act === true }, parsePrefs(get('sim_prefs')), createdAt);
}

export function parseHandoffParams(qs: URLSearchParams, now = Date.now()): SimHandoff | null {
  if (!qs.has('sim_objectif')) return null;
  try { return fromRaw(k => qs.get(k), now); } catch { return null; }
}

export function saveHandoff(h: SimHandoff) {
  try { localStorage.setItem(SIM_HANDOFF_KEY, JSON.stringify(handoffToStore(h))); } catch { /* stockage indisponible */ }
}
const handoffToStore = (h: SimHandoff) => Object.fromEntries([...handoffToParams(h, new URLSearchParams())]);

export function loadHandoff(now = Date.now()): SimHandoff | null {
  try {
    const raw = localStorage.getItem(SIM_HANDOFF_KEY);
    if (!raw || raw.length > 2000) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    return typeof o === 'object' && o ? fromRaw(k => o[k], now) : null;
  } catch { return null; }
}

/** Champs équivalents du plan personnalisé (objectif ANNUEL de chiffre d'affaires ajouté). */
export function handoffToGoalFields(h: SimHandoff) {
  return { goal_kind: 'sales' as const, goal_amount: h.objective, horizon: '12m' as const, avg_sale: h.avgTicket, conversion_pct: h.conversionPct };
}

/** Valeurs déjà présentes et différentes : l'entrepreneur confirme avant tout remplacement. */
export function goalConflicts(existing: Record<string, unknown>, h: SimHandoff): boolean {
  const g = handoffToGoalFields(h);
  return (['goal_amount', 'avg_sale', 'conversion_pct', 'goal_kind'] as const)
    .some(k => existing[k] !== undefined && existing[k] !== null && existing[k] !== g[k]);
}
