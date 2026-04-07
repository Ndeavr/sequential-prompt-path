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

const SIZE_DEFS = [
  { code: "xs", label: "XS", units: 0.5, avgValue: 800 },
  { code: "s", label: "S", units: 1, avgValue: 2500 },
  { code: "m", label: "M", units: 1.5, avgValue: 6000 },
  { code: "l", label: "L", units: 2, avgValue: 15000 },
  { code: "xl", label: "XL", units: 3, avgValue: 35000 },
  { code: "xxl", label: "XXL", units: 5, avgValue: 75000 },
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
  const boost = s < 40 ? 0.15 : s < 60 ? 0.10 : 0.05;
  return Math.min(current + boost, 0.85);
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

    // Current reality
    const currentRev = inputs.submissionsPerMonth * cr * inputs.avgContractValue;
    const currentProfit = currentRev * pm;

    if (currentRev <= 0) return null;

    // Multipliers
    const scoreMult = getScoreMultiplier(inputs.preUnproScore);
    const cityMult = getCityMultiplier(inputs.city || "montreal");
    const capacityMult = Math.min(1 + (inputs.appointmentsCapacityWeekly * 4.33 - inputs.submissionsPerMonth * cr) * 0.01, 1.25);
    const totalMultMin = scoreMult * 0.85 * cityMult * Math.max(capacityMult, 0.9);
    const totalMultMax = scoreMult * 1.15 * cityMult * Math.min(capacityMult * 1.1, 1.4);

    const projMin = Math.round(currentRev * totalMultMin / 100) * 100;
    const projMax = Math.round(currentRev * totalMultMax / 100) * 100;
    const projProfMin = Math.round(projMin * pm);
    const projProfMax = Math.round(projMax * pm);
    const lostMin = Math.max(0, projMin - currentRev);
    const lostMax = Math.max(0, projMax - currentRev);

    // Required appointments
    const improvedCR = getImprovedCloseRate(cr, inputs.preUnproScore);
    const valuePerAppt = inputs.avgContractValue * improvedCR;
    const target = Math.max(inputs.revenueTargetMonthly, currentRev);
    const reqMonthly = Math.ceil(target / valuePerAppt);
    const reqWeekly = Math.round((reqMonthly / 4.33) * 10) / 10;

    // Capacity status
    const weekCap = inputs.appointmentsCapacityWeekly;
    const capacityStatus: GoalResults["capacityStatus"] =
      reqWeekly > weekCap * 1.2 ? "surcharge" : reqWeekly > weekCap * 0.8 ? "equilibre" : "suffisant";

    // Mix
    const mix = generateMix(reqMonthly, inputs.preferredProjectSize, inputs.avgContractValue, inputs.preferredLeadQuality);

    // Total units
    const totalUnits = mix.reduce((sum, m) => {
      const def = SIZE_DEFS.find(s => s.code === m.size);
      return sum + m.count * (def?.units ?? 1);
    }, 0);

    // Plan matching
    let plan = PLAN_THRESHOLDS[0];
    for (const p of PLAN_THRESHOLDS) {
      if (totalUnits <= p.maxUnits && target <= p.maxValue) {
        plan = p;
        break;
      }
      plan = p;
    }

    // Confidence
    const conf = Math.min(95, 60 + (capacityStatus === "equilibre" ? 20 : capacityStatus === "suffisant" ? 15 : 5) + (inputs.city ? 10 : 0));

    return {
      currentMonthlyRevenue: Math.round(currentRev),
      currentMonthlyProfit: Math.round(currentProfit),
      projectedRevenueMin: projMin,
      projectedRevenueMax: projMax,
      projectedProfitMin: projProfMin,
      projectedProfitMax: projProfMax,
      lostRevenueMin: Math.round(lostMin / 100) * 100,
      lostRevenueMax: Math.round(lostMax / 100) * 100,
      lostProfitMin: Math.round(lostMin * pm / 100) * 100,
      lostProfitMax: Math.round(lostMax * pm / 100) * 100,
      requiredAppointmentsMonthly: reqMonthly,
      requiredAppointmentsWeekly: reqWeekly,
      appointmentMix: mix,
      recommendedPlan: plan.code,
      planMatchConfidence: conf,
      territoryStatus: "disponible",
      exclusivityPossible: plan.code === "signature" || plan.code === "elite",
      capacityStatus,
    };
  }, [inputs]);

  return { inputs, updateInput, results, step, setStep };
}

function generateMix(
  total: number,
  pref: string,
  avgValue: number,
  quality: string
): AppointmentMixItem[] {
  const weights: Record<string, number[]> = {
    xs: [0.15, 0.1, 0.05, 0.02, 0, 0],
    s: [0.1, 0.3, 0.15, 0.05, 0.02, 0],
    m: [0.05, 0.15, 0.4, 0.15, 0.05, 0],
    l: [0.02, 0.05, 0.2, 0.4, 0.15, 0.05],
    xl: [0, 0.02, 0.1, 0.2, 0.4, 0.15],
    xxl: [0, 0, 0.05, 0.1, 0.25, 0.45],
    mixed: [0.05, 0.1, 0.25, 0.3, 0.2, 0.1],
  };

  let w = weights[pref] || weights.mixed;
  if (quality === "quality") {
    w = w.map((v, i) => (i >= 3 ? v * 1.3 : v * 0.7));
  } else if (quality === "volume") {
    w = w.map((v, i) => (i <= 2 ? v * 1.3 : v * 0.7));
  }
  const sum = w.reduce((a, b) => a + b, 0);
  w = w.map(v => v / sum);

  return SIZE_DEFS.map((def, i) => {
    const count = Math.max(0, Math.round(total * w[i]));
    return { size: def.code, label: def.label, count, avgValue: def.avgValue };
  }).filter(m => m.count > 0);
}
