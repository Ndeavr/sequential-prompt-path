import { describe, expect, it } from "vitest";
import { calculateContractorProjection, parseQuebecDecimal } from "./contractorObjectiveProjection";

const base = {
  mode: "profit" as const, target: 50000, months: 12,
  averageContract: 4000, conversionPercent: 40,
  marginPercent: 35, monthlyCapacity: 48,
};
describe("contractor objective projection", () => {
  it("calculates the required monthly appointments from a 12-month profit objective", () => {
    const result = calculateContractorProjection(base)!;
    expect(result.revenueTarget).toBeCloseTo(142857.142857);
    expect(result.contractsNeeded).toBeCloseTo(35.7142857);
    expect(result.monthlyAppointmentsNeeded).toBeCloseTo(7.44047619);
    expect(result.capacityExceeded).toBe(false);
  });
  it("does not confuse capacity with forecasted appointments", () => {
    const result = calculateContractorProjection({ ...base, monthlyCapacity: 4 })!;
    expect(result.monthlyAppointmentsNeeded).toBeCloseTo(7.44047619);
    expect(result.capacityExceeded).toBe(true);
  });
  it("supports revenue goals and rejects invalid assumptions", () => {
    expect(calculateContractorProjection({ ...base, mode: "revenue" })?.revenueTarget).toBe(50000);
    expect(calculateContractorProjection({ ...base, conversionPercent: 0 })).toBeNull();
    expect(calculateContractorProjection({ ...base, months: 0 })).toBeNull();
  });
  it("accepts French numeric input without accepting junk", () => {
    expect(parseQuebecDecimal("48,")).toBe(48);
    expect(parseQuebecDecimal("1 250,50")).toBe(1250.5);
    expect(parseQuebecDecimal("48,abc")).toBeNull();
  });
});
