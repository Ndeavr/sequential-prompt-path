/** Pure, non-commercial projections for the contractor objective calculator.
 * Capacity is a ceiling, never a promise of appointments delivered.
 * All monetary amounts are pretax CAD. */
export type ObjectiveMode = "profit" | "revenue";
export interface ContractorProjectionInput {
  mode: ObjectiveMode;
  target: number;
  months: number;
  averageContract: number;
  conversionPercent: number;
  marginPercent: number;
  monthlyCapacity: number;
}
export interface ContractorProjection {
  revenueTarget: number;
  profitTarget: number;
  contractsNeeded: number;
  appointmentsNeeded: number;
  monthlyAppointmentsNeeded: number;
  capacityExceeded: boolean;
}
export function parseQuebecDecimal(value: string): number | null {
  const normalized = value.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}
export function calculateContractorProjection(input: ContractorProjectionInput): ContractorProjection | null {
  const { mode, target, months, averageContract, conversionPercent, marginPercent, monthlyCapacity } = input;
  if (![target, months, averageContract, conversionPercent, marginPercent, monthlyCapacity].every(Number.isFinite)
    || target < 0 || months <= 0 || averageContract <= 0 || conversionPercent <= 0
    || conversionPercent > 100 || marginPercent <= 0 || marginPercent > 100 || monthlyCapacity < 0
    || (mode !== "profit" && mode !== "revenue")) return null;
  const revenueTarget = mode === "profit" ? target / (marginPercent / 100) : target;
  const profitTarget = revenueTarget * marginPercent / 100;
  const contractsNeeded = revenueTarget / averageContract;
  const appointmentsNeeded = contractsNeeded / (conversionPercent / 100);
  const monthlyAppointmentsNeeded = appointmentsNeeded / months;
  return { revenueTarget, profitTarget, contractsNeeded, appointmentsNeeded,
    monthlyAppointmentsNeeded, capacityExceeded: monthlyAppointmentsNeeded > monthlyCapacity };
}
