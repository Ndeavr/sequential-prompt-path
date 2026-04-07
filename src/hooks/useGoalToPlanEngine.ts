import { useState, useCallback, useMemo } from "react";

export interface GoalInputs {
  submissionsPerMonth: number;
  closeRatePercent: number;
  avgContractValue: number;
  profitMarginPercent: number;
  city: string;
  category: string;
  preUnproScore: number | null;
  revenueTargetMonthly: number;
  growthTargetPercent: number;
  appointmentsCapacityWeekly: number;
  preferredProjectSize: "xs" | "s" | "m" | "l" | "xl" | "xxl" | "mixed";
  preferredTerritory: string;
  preferredLeadQuality: "volume" | "quality" | "balanced";
}

export interface GoalResults {
  currentMonthlyRevenue: number;
  currentMonthlyProfit: number;
  projectedRevenueMin: number;
  projectedRevenueMax: number;
  projectedProfitMin: number;
  projectedProfitMax: number;
  lostRevenueMin: number;
  lostRevenueMax: number;
  lostProfitMin: number;
  lostProfitMax: number;
  requiredAppointmentsMonthly: number;
  requiredAppointmentsWeekly: number;
  appointmentMix: AppointmentMixItem[];
  recommendedPlan: string;
  planMatchConfidence: number;
  territoryStatus: string;
  exclusivityPossible: boolean;
  capacityStatus: "surcharge" | "equilibre" | "suffisant";
}

export interface AppointmentMixItem {
  size: string;
  label: string;
  count: number;
  avgValue: number;
}

const PLAN_THRESHOLDS = [
  { code: "recrue", label: "Recrue", maxUnits: 6, maxValue: 15000 },
  { code: "pro", label: "Pro", maxUnits: 14, maxValue: 35000 },
  { code: "premium", label: "Premium", maxUnits: 25, maxValue: 65000 },
  { code: "elite", label: "Élite", maxUnits: 40, maxValue: 120000 },
  { code: "signature", label: "Signature", maxUnits: 999, maxValue: 999999 },
];

// Relative size ratios (M = 1.0 anchor)
const SIZE_RATIOS = [
  { code: "xs", label: "XS", units: 0.5, ratio: 0.15 },
  { code: "s", label: "S", units: 1, ratio: 0.45 },
  { code: "m", label: "M", units: 1.5, ratio: 1.0 },
  { code: "l", label: "L", units: 2, ratio: 2.2 },
  { code: "xl", label: "XL", units: 3, ratio: 5.0 },
  { code: "xxl", label: "XXL", units: 5, ratio: 10.0 },
];

function getScoreMultiplier(score: number | null): number {
  const s = score ?? 35;
  if (s >= 80) return 1.15;
  if (s >= 60) return 1.35;
  if (s >= 40) return 1.60;
  return 1.90;
}

function getCityMultiplier(city: string): number {
  const large = ["montreal", "québec", "laval", "longueuil", "gatineau"];
  const c = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (large.some(l => c.includes(l))) return 1.15;
  return 1.05;
}

function getImprovedCloseRate(current: number, score: number | null): number {
  const s = score ?? 35;
  const boost = s < 40 ? 0.12 : s < 60 ? 0.08 : 0.04;
  return Math.min(current + boost, 0.75);
}

/**
 * Build SIZE_DEFS scaled to the entrepreneur's avg contract value.
 * The entrepreneur's avg is mapped to the "M" anchor (ratio=1.0).
 * Other sizes scale proportionally.
 */
function buildScaledSizes(avgContractValue: number) {
  return SIZE_RATIOS.map(s => ({
    ...s,
    avgValue: roundNice(avgContractValue * s.ratio),
  }));
}

/** Round to a "nice" number for display (nearest 50 for small, 500 for large) */
function roundNice(v: number): number {
  if (v < 500) return Math.round(v / 50) * 50;
  if (v < 5000) return Math.round(v / 100) * 100;
  if (v < 20000) return Math.round(v / 500) * 500;
  return Math.round(v / 1000) * 1000;
}

export function useGoalToPlanEngine() {
  const [inputs, setInputs] = useState<GoalInputs>({
    submissionsPerMonth: 20,
    closeRatePercent: 30,
    avgContractValue: 8000,
    profitMarginPercent: 22,
    city: "",
    category: "",
    preUnproScore: null,
    revenueTargetMonthly: 40000,
    growthTargetPercent: 50,
    appointmentsCapacityWeekly: 5,
    preferredProjectSize: "mixed",
    preferredTerritory: "",
    preferredLeadQuality: "balanced",
  });

  const [step, setStep] = useState(0);

  const updateInput = useCallback(<K extends keyof GoalInputs>(key: K, value: GoalInputs[K]) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  const results = useMemo<GoalResults | null>(() => {
    const cr = inputs.closeRatePercent / 100;
    const pm = inputs.profitMarginPercent / 100;

    // ── Current reality ──
    const currentRev = inputs.submissionsPerMonth * cr * inputs.avgContractValue;
    const currentProfit = currentRev * pm;

    if (currentRev <= 0) return null;

    // ── Projected revenue with UNPRO (lost revenue shock) ──
    const scoreMult = getScoreMultiplier(inputs.preUnproScore);
    const cityMult = getCityMultiplier(inputs.city || "montreal");
    // Capacity multiplier: more capacity → more room for growth
    const monthlyCapacity = inputs.appointmentsCapacityWeekly * 4.33;
    const currentContracts = inputs.submissionsPerMonth * cr;
    const capacityRatio = monthlyCapacity > 0 ? Math.min((monthlyCapacity - currentContracts) / monthlyCapacity, 0.5) : 0;
    const capacityMult = 1 + Math.max(capacityRatio * 0.3, 0);

    // Conservative and optimistic bounds
    const totalMultMin = scoreMult * 0.80 * cityMult * capacityMult;
    const totalMultMax = scoreMult * 1.10 * cityMult * capacityMult;

    // Cap multipliers to avoid unrealistic projections
    const cappedMultMin = Math.min(totalMultMin, 3.0);
    const cappedMultMax = Math.min(totalMultMax, 4.5);

    const projMin = Math.round(currentRev * cappedMultMin / 100) * 100;
    const projMax = Math.round(currentRev * cappedMultMax / 100) * 100;
    const projProfMin = Math.round(projMin * pm / 100) * 100;
    const projProfMax = Math.round(projMax * pm / 100) * 100;

    const lostMin = Math.max(0, Math.round((projMin - currentRev) / 100) * 100);
    const lostMax = Math.max(0, Math.round((projMax - currentRev) / 100) * 100);
    const lostProfMin = Math.round(lostMin * pm / 100) * 100;
    const lostProfMax = Math.round(lostMax * pm / 100) * 100;

    // ── Appointments calculation ──
    const improvedCR = getImprovedCloseRate(cr, inputs.preUnproScore);
    const scaledSizes = buildScaledSizes(inputs.avgContractValue);
    const target = Math.max(inputs.revenueTargetMonthly, currentRev);

    // Generate mix first with a rough appointment estimate, then refine
    const roughAppts = Math.ceil(target / (inputs.avgContractValue * improvedCR));
    const mix = generateMix(roughAppts, inputs.preferredProjectSize, inputs.preferredLeadQuality, scaledSizes);

    // Compute weighted average value from the mix
    const totalMixCount = mix.reduce((s, m) => s + m.count, 0);
    const totalMixRevenue = mix.reduce((s, m) => s + m.count * m.avgValue, 0);
    const weightedAvgValue = totalMixCount > 0 ? totalMixRevenue / totalMixCount : inputs.avgContractValue;

    // Recalculate exact appointments needed using weighted mix value
    const expectedValuePerAppt = weightedAvgValue * improvedCR;
    let reqMonthly = Math.max(1, Math.ceil(target / expectedValuePerAppt));

    // Cap to reasonable bounds (max 3x current submissions)
    reqMonthly = Math.min(reqMonthly, inputs.submissionsPerMonth * 3);

    // Regenerate final mix with corrected count
    const finalMix = generateMix(reqMonthly, inputs.preferredProjectSize, inputs.preferredLeadQuality, scaledSizes);

    const reqWeekly = Math.round((reqMonthly / 4.33) * 10) / 10;

    // Capacity status
    const capacityStatus: GoalResults["capacityStatus"] =
      reqWeekly > inputs.appointmentsCapacityWeekly * 1.2 ? "surcharge"
      : reqWeekly > inputs.appointmentsCapacityWeekly * 0.8 ? "equilibre"
      : "suffisant";

    // ── Plan matching ──
    const totalUnits = finalMix.reduce((sum, m) => {
      const def = SIZE_RATIOS.find(s => s.code === m.size);
      return sum + m.count * (def?.units ?? 1);
    }, 0);

    let plan = PLAN_THRESHOLDS[0];
    for (const p of PLAN_THRESHOLDS) {
      if (totalUnits <= p.maxUnits && target <= p.maxValue) {
        plan = p;
        break;
      }
      plan = p;
    }

    // Confidence
    const conf = Math.min(95,
      60
      + (capacityStatus === "equilibre" ? 20 : capacityStatus === "suffisant" ? 15 : 5)
      + (inputs.city ? 10 : 0)
    );

    return {
      currentMonthlyRevenue: Math.round(currentRev),
      currentMonthlyProfit: Math.round(currentProfit),
      projectedRevenueMin: projMin,
      projectedRevenueMax: projMax,
      projectedProfitMin: projProfMin,
      projectedProfitMax: projProfMax,
      lostRevenueMin: lostMin,
      lostRevenueMax: lostMax,
      lostProfitMin: lostProfMin,
      lostProfitMax: lostProfMax,
      requiredAppointmentsMonthly: reqMonthly,
      requiredAppointmentsWeekly: reqWeekly,
      appointmentMix: finalMix,
      recommendedPlan: plan.code,
      planMatchConfidence: conf,
      territoryStatus: "disponible",
      exclusivityPossible: plan.code === "signature" || plan.code === "elite",
      capacityStatus,
    };
  }, [inputs]);

  return { inputs, updateInput, results, step, setStep };
}

/**
 * Generate appointment mix distribution.
 * Sizes are pre-scaled to the entrepreneur's avg contract value.
 */
function generateMix(
  total: number,
  pref: string,
  quality: string,
  scaledSizes: ReturnType<typeof buildScaledSizes>,
): AppointmentMixItem[] {
  const weights: Record<string, number[]> = {
    xs: [0.40, 0.25, 0.15, 0.10, 0.07, 0.03],
    s: [0.15, 0.35, 0.25, 0.15, 0.07, 0.03],
    m: [0.08, 0.17, 0.40, 0.22, 0.10, 0.03],
    l: [0.03, 0.08, 0.20, 0.38, 0.22, 0.09],
    xl: [0.02, 0.05, 0.12, 0.22, 0.38, 0.21],
    xxl: [0.01, 0.03, 0.08, 0.15, 0.28, 0.45],
    mixed: [0.08, 0.15, 0.30, 0.27, 0.14, 0.06],
  };

  let w = [...(weights[pref] || weights.mixed)];
  if (quality === "quality") {
    w = w.map((v, i) => (i >= 3 ? v * 1.3 : v * 0.8));
  } else if (quality === "volume") {
    w = w.map((v, i) => (i <= 2 ? v * 1.3 : v * 0.8));
  }
  const sum = w.reduce((a, b) => a + b, 0);
  w = w.map(v => v / sum);

  // Distribute using largest remainder method for accurate totals
  const rawCounts = w.map(wi => total * wi);
  const floorCounts = rawCounts.map(c => Math.floor(c));
  let remaining = total - floorCounts.reduce((a, b) => a + b, 0);
  const remainders = rawCounts.map((c, i) => ({ i, r: c - floorCounts[i] }));
  remainders.sort((a, b) => b.r - a.r);
  for (let j = 0; j < remaining; j++) {
    floorCounts[remainders[j].i]++;
  }

  return scaledSizes.map((def, i) => ({
    size: def.code,
    label: def.label,
    count: floorCounts[i],
    avgValue: def.avgValue,
  })).filter(m => m.count > 0);
}
