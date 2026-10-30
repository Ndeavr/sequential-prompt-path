import { describe, it, expect, beforeEach } from 'vitest';
import { SIM_DEFAULTS } from '@/lib/heatPumpRevenueSim';
import { buildHandoff, handoffToParams, parseHandoffParams, saveHandoff, loadHandoff, goalConflicts, handoffToGoalFields } from '@/lib/heatPumpSimHandoff';
import { defaultHeatPumpPreferences } from '@/lib/heatPumpDemo';

const NOW = 1_800_000_000_000;
const roundTrip = (input = SIM_DEFAULTS) => parseHandoffParams(handoffToParams(buildHandoff(input, defaultHeatPumpPreferences, NOW)!, new URLSearchParams()), NOW);

describe('heat pump simulator handoff', () => {
  beforeEach(() => localStorage.clear());
  it('default scenario: 1 000 000 / 15 000 / 40 % / 100 % → 67 sales, 168 annual, 14 monthly', () => {
    const h = roundTrip()!;
    expect([h.objective, h.avgTicket, h.conversionPct, h.showRatePct, h.weeks]).toEqual([1_000_000, 15_000, 40, 100, 48]);
    expect([h.sales, h.plannedAppointments, h.monthlyAppointments]).toEqual([67, 168, 14]);
    expect(handoffToGoalFields(h)).toEqual({ goal_kind: 'sales', goal_amount: 1_000_000, horizon: '12m', avg_sale: 15_000, conversion_pct: 40 });
    expect(h.preferences).toEqual(defaultHeatPumpPreferences);
  });
  it('1 780 000 and 16 400 carry over exactly and are recalculated', () => {
    const h = roundTrip({ ...SIM_DEFAULTS, objective: 1_780_000, avgTicket: 16_400 })!;
    expect(h.objective).toBe(1_780_000);
    expect(h.avgTicket).toBe(16_400);
    expect(h.sales).toBe(109);
    expect(h.plannedAppointments).toBe(273);
  });
  it('ignores malformed, out-of-range or stale context without throwing', () => {
    expect(parseHandoffParams(new URLSearchParams('sim_objectif=abc'), NOW)).toBeNull();
    const qs = handoffToParams(buildHandoff(SIM_DEFAULTS, null, NOW)!, new URLSearchParams());
    qs.set('sim_conversion', '0'); expect(parseHandoffParams(qs, NOW)).toBeNull();
    qs.set('sim_conversion', '40'); qs.set('sim_panier', '1e9'); expect(parseHandoffParams(qs, NOW)).toBeNull();
    qs.set('sim_panier', '15000'); expect(parseHandoffParams(qs, NOW + 40 * 864e5)).toBeNull();
    localStorage.setItem('unpro_heatpump_sim_handoff_v1', '{bad'); expect(loadHandoff(NOW)).toBeNull();
  });
  it('transmitted computed values are never trusted', () => {
    const qs = handoffToParams(buildHandoff(SIM_DEFAULTS, null, NOW)!, new URLSearchParams());
    qs.set('sim_rdv', '1');
    expect(parseHandoffParams(qs, NOW)!.plannedAppointments).toBe(168);
  });
  it('persists locally for page changes', () => {
    saveHandoff(buildHandoff(SIM_DEFAULTS, null, NOW)!);
    expect(loadHandoff(NOW)!.plannedAppointments).toBe(168);
  });
  it('existing different plan values require confirmation; activation stays declared only', () => {
    const h = roundTrip({ ...SIM_DEFAULTS, alreadyActivated: true })!;
    expect(goalConflicts({}, h)).toBe(false);
    expect(goalConflicts({ goal_amount: 1_000_000, avg_sale: 15_000 }, h)).toBe(false);
    expect(goalConflicts({ goal_amount: 30_000 }, h)).toBe(true);
    expect(h.alreadyActivatedDeclared).toBe(true);
    expect(Object.keys(handoffToGoalFields(h))).not.toContain('activated');
  });
});
