import { describe, expect, it } from 'vitest';
import { calculateCombinedSavings, SAVINGS_MODEL } from '@/data/combinedSavingsCampaign';

describe('approved combined savings planning scenario', () => {
  it('covers ten years from 2027 through 2036', () => {
    expect(SAVINGS_MODEL.startYear).toBe(2027);
    expect(SAVINGS_MODEL.endYear).toBe(2036);
    expect(SAVINGS_MODEL.endYear - SAVINGS_MODEL.startYear + 1).toBe(SAVINGS_MODEL.years);
  });
  it('uses 4000 average annual businesses and 40000 business-years', () => {
    expect(SAVINGS_MODEL.averageBusinesses).toBe(4000);
    expect(calculateCombinedSavings().businessYears).toBe(40000);
  });
  it('generates 100 million CAD from 2500 net per business per year', () => {
    expect(SAVINGS_MODEL.annualNetSavings).toBe(2500);
    expect(calculateCombinedSavings().generated).toBe(100000000);
  });
  it('retains 60 percent, 1500 annually and 60 million for businesses', () => {
    expect(SAVINGS_MODEL.entrepreneurShare).toBe(0.6);
    expect(SAVINGS_MODEL.annualNetSavings * SAVINGS_MODEL.entrepreneurShare).toBe(1500);
    expect(calculateCombinedSavings().entrepreneur).toBe(60000000);
  });
  it('passes 40 percent, 1000 annually and 40 million to homeowners', () => {
    expect(SAVINGS_MODEL.homeownerShare).toBe(0.4);
    expect(SAVINGS_MODEL.annualNetSavings * SAVINGS_MODEL.homeownerShare).toBe(1000);
    expect(calculateCombinedSavings().homeowner).toBe(40000000);
  });
  it('does not double count the price transfer', () => {
    const result = calculateCombinedSavings();
    expect(result.entrepreneur + result.homeowner).toBe(result.generated);
    expect(calculateCombinedSavings(2, 100, 3).generated).toBe(600);
  });
  it('rounds the monthly equivalent of 2500 to 208.33', () => {
    expect(Number(calculateCombinedSavings().monthly.toFixed(2))).toBe(208.33);
  });
  it('keeps initial 3000 activations separate from average participation', () => {
    expect(SAVINGS_MODEL.initialActivationGoal).toBe(3000);
    expect(SAVINGS_MODEL.initialActivationGoal).not.toBe(SAVINGS_MODEL.averageBusinesses);
  });
  it('does not manufacture a measured savings total', () => {
    expect(SAVINGS_MODEL.measuredSavings).toBeNull();
  });
});