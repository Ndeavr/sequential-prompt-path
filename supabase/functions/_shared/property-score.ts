export type PropertyAnalysisInput = {
  property: {
    year_built?: number | null;
    property_type?: string | null;
    square_footage?: number | null;
  };
  derived: {
    roofAge?: number | null;
    insulation?: "poor" | "average" | "good" | "excellent" | null;
    windowsCondition?: "poor" | "average" | "good" | null;
    heatingType?: string | null;
    humidityIssue?: boolean;
    electricalUpdated?: boolean;
    plumbingUpdated?: boolean;
  };
};

export type PropertyScoreResult = {
  overall_score: number;
  component_scores: Record<string, number>;
  confidence_score: number;
  scoring_version: string;
  source: string;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateHomeScore(
  input: PropertyAnalysisInput,
): PropertyScoreResult {
  const yearBuilt = input.property.year_built ?? null;
  const roofAge = input.derived.roofAge ?? null;
  const insulationLevel = input.derived.insulation ?? "average";
  const windowsCondition = input.derived.windowsCondition ?? "average";
  const heatingType = input.derived.heatingType ?? null;
  const humidityIssue = Boolean(input.derived.humidityIssue);
  const electricalUpdated = Boolean(input.derived.electricalUpdated);
  const plumbingUpdated = Boolean(input.derived.plumbingUpdated);

  let structure = 78;
  let insulation = 60;
  let roof = 72;
  const humidity = humidityIssue ? 35 : 88;
  const windows =
    windowsCondition === "good"
      ? 85
      : windowsCondition === "average"
        ? 65
        : 40;
  const heating = heatingType ? 78 : 55;
  const electrical = electricalUpdated ? 86 : 58;
  const plumbing = plumbingUpdated ? 84 : 58;

  if (yearBuilt) {
    if (yearBuilt < 1950) structure -= 18;
    else if (yearBuilt < 1970) structure -= 10;
    else if (yearBuilt < 1990) structure -= 4;
    else structure += 4;
  }

  if (insulationLevel === "poor") insulation = 35;
  else if (insulationLevel === "average") insulation = 60;
  else if (insulationLevel === "good") insulation = 80;
  else if (insulationLevel === "excellent") insulation = 92;

  if (typeof roofAge === "number") {
    if (roofAge <= 5) roof = 93;
    else if (roofAge <= 10) roof = 84;
    else if (roofAge <= 15) roof = 72;
    else if (roofAge <= 20) roof = 58;
    else roof = 36;
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

  let confidence = 55;
  if (yearBuilt) confidence += 6;
  if (roofAge !== null) confidence += 8;
  if (insulationLevel) confidence += 6;
  if (windowsCondition) confidence += 5;
  if (heatingType) confidence += 5;
  if (typeof input.derived.humidityIssue === "boolean") confidence += 5;
  if (typeof input.derived.electricalUpdated === "boolean") confidence += 5;
  if (typeof input.derived.plumbingUpdated === "boolean") confidence += 5;

  return {
    overall_score: clamp(overall),
    component_scores: {
      structure: clamp(structure),
      insulation: clamp(insulation),
      roof: clamp(roof),
      humidity: clamp(humidity),
      windows: clamp(windows),
      heating: clamp(heating),
      electrical: clamp(electrical),
      plumbing: clamp(plumbing),
    },
    confidence_score: clamp(confidence),
    scoring_version: "v1",
    source: "system",
  };
}
