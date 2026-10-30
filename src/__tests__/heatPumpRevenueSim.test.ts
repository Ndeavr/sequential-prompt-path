import { describe, it, expect } from 'vitest';
import { simulate, SIM_DEFAULTS, clampField } from '@/lib/heatPumpRevenueSim';

describe('heat pump +1M simulator', () => {
  it('reference case 67 / 168 / 33 950', () => {
    const r = simulate(SIM_DEFAULTS);
    if (!r.ok) throw new Error();
    expect(r.sales).toBe(67);
    expect(r.heldAppointments).toBe(168);
    expect(r.plannedAppointments).toBe(168);
    expect(r.monthlyAppointments).toBe(14);
    expect(r.weeklyAppointments).toBe(3.5);
    expect(r.revenue).toBe(1_005_000);
    expect(r.totalCost).toBe(33_950);
    expect(r.monthlyAverageCost).toBe(2829.17);
    expect(r.costPerSale).toBe(506.72);
    expect(r.activationCost).toBe(350);
  });
  it('excludes activation when already activated, adds subscription x12', () => {
    const r = simulate({ ...SIM_DEFAULTS, alreadyActivated: true, monthlySubscription: 100 });
    if (!r.ok) throw new Error();
    expect(r.activationCost).toBe(0);
    expect(r.totalCost).toBe(168 * 200 + 1200);
  });
  it('varies ticket, conversion and show rate', () => {
    const a = simulate({ ...SIM_DEFAULTS, avgTicket: 20_000 }); if (!a.ok) throw new Error();
    expect(a.sales).toBe(50); expect(a.heldAppointments).toBe(125);
    const b = simulate({ ...SIM_DEFAULTS, conversionPct: 25 }); if (!b.ok) throw new Error();
    expect(b.heldAppointments).toBe(268);
    const c = simulate({ ...SIM_DEFAULTS, showRatePct: 80 }); if (!c.ok) throw new Error();
    expect(c.plannedAppointments).toBe(210);
  });
  it('zero rates and empty fields are not calculable', () => {
    expect(simulate({ ...SIM_DEFAULTS, conversionPct: 0 })).toEqual({ ok: false, reason: 'zero_rate' });
    expect(simulate({ ...SIM_DEFAULTS, showRatePct: 0 })).toEqual({ ok: false, reason: 'zero_rate' });
    expect(simulate({ ...SIM_DEFAULTS, avgTicket: null })).toEqual({ ok: false, reason: 'empty' });
  });
  it('clamps to strict bounds', () => {
    expect(clampField('conversionPct', 140)).toBe(100);
    expect(clampField('weeks', 0)).toBe(1);
  });
});
