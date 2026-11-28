import { describe, expect, it } from 'vitest';
import { PIONEER_2026, pioneerDateOpen, pioneerNumber, pioneerSavings } from './pioneer2026';
describe('Owner-approved Pionnier 2026 terms', () => {
  it('350 CAD first year, 50 monthly and 500 annual with no automatic renewal', () => {
    expect(PIONEER_2026.firstYearCents).toBe(35000);
    expect(PIONEER_2026.monthlyCents * 12).toBe(60000);
    expect(PIONEER_2026.annualCents).toBe(50000);
    expect(PIONEER_2026.months).toBe(12);
    expect(PIONEER_2026.automaticRenewal).toBe(false);
  });
  it('saves exactly 250 versus monthly and 150 versus annual', () => {
    expect(pioneerSavings()).toEqual({ monthly: 25000, annual: 15000 });
  });
  it('closes after Dec 31 inclusive America/Toronto', () => {
    expect(pioneerDateOpen(new Date('2027-01-01T04:59:59.999Z'))).toBe(true);
    expect(pioneerDateOpen(new Date('2027-01-01T05:00:00.000Z'))).toBe(false);
    expect(pioneerDateOpen(new Date('invalid'))).toBe(false);
  });
  it('historical numbers are 0001 through 1000, never outside cap', () => {
    expect(pioneerNumber(1)).toBe('0001');
    expect(pioneerNumber(2)).toBe('0002');
    expect(pioneerNumber(1000)).toBe('1000');
    for (const n of [0, 1001, 1.2]) expect(pioneerNumber(n)).toBeNull();
  });
});