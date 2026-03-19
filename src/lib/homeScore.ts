/**
 * UNPRO — Home Score Calculator (client-side)
 */

export type PropertyInput = {
  yearBuilt?: number;
  insulation?: "poor" | "average" | "good" | "excellent";
  roofAge?: number;
  windowsCondition?: "poor" | "average" | "good";
  heatingType?: string;
  humidityIssue?: boolean;
  electricalUpdated?: boolean;
  plumbingUpdated?: boolean;
};

export function calculateHomeScore(input: PropertyInput) {
  let structure = 75;
  let insulation = 60;
  let roof = 70;
  const humidity = input.humidityIssue ? 30 : 85;
  const windows =
    input.windowsCondition === "good"
      ? 85
      : input.windowsCondition === "average"
        ? 65
        : 40;
  const heating = input.heatingType ? 75 : 50;
  const electrical = input.electricalUpdated ? 85 : 55;
  const plumbing = input.plumbingUpdated ? 85 : 55;

  if (input.yearBuilt && input.yearBuilt < 1970) structure -= 10;

  if (input.insulation === "poor") insulation = 35;
  if (input.insulation === "average") insulation = 60;
  if (input.insulation === "good") insulation = 80;
  if (input.insulation === "excellent") insulation = 92;

  if (typeof input.roofAge === "number") {
    if (input.roofAge <= 5) roof = 92;
    else if (input.roofAge <= 12) roof = 80;
    else if (input.roofAge <= 20) roof = 60;
    else roof = 35;
  }

  const overall =
    structure * 0.18 +
    insulation * 0.16 +
    roof * 0.16 +
    humidity * 0.14 +
    windows * 0.1 +
    heating * 0.08 +
    electrical * 0.09 +
    plumbing * 0.09;

  return {
    overall_score: Number(overall.toFixed(2)),
    structure_score: structure,
    insulation_score: insulation,
    roof_score: roof,
    humidity_score: humidity,
    windows_score: windows,
    heating_score: heating,
    electrical_score: electrical,
    plumbing_score: plumbing,
    confidence_score: 72,
  };
}
