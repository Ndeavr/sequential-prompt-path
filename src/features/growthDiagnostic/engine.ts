import type { DiagnosticInputs, DiagnosticResult } from "./types";

const PLAN_PRICES = {
  Recrue: 149, Pro: 349, Premium: 599, "Élite": 999, Signature: 1799,
} as const;

export const fmtMoney = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(
    Math.max(0, Math.round(n)),
  );

export function compute(inp: DiagnosticInputs): DiagnosticResult {
  const leads = inp.monthly_leads ?? 0;
  const acv = inp.avg_contract_value ?? 0;
  const closing = (inp.closing_rate ?? 0) / 100;
  const appts = inp.monthly_appointments ?? 0;
  const team = inp.team_size ?? 1;
  const trucks = inp.trucks ?? 1;
  const projects = inp.monthly_projects ?? 0;
  const annual = inp.annual_revenue ?? 0;

  // Missed-leads loss: assume 25% of leads are unanswered / lost to slow response
  const missed_leads = Math.max(0, leads * 0.25 * closing * acv);

  // Shared-leads tax: 22% margin compression on appointments tied to shared leads
  const sharedFactor = inp.uses_shared_leads === "yes" ? 0.22
    : inp.uses_shared_leads === "sometimes" ? 0.12 : 0;
  const shared_leads_tax = sharedFactor * appts * closing * acv;

  // Capacity gap: theoretical monthly capacity vs actual projects
  const capacityPerCrew = 4; // projects per crew/month
  const crewCount = Math.max(team, trucks);
  const capacity = crewCount * capacityPerCrew;
  const gap = Math.max(0, capacity - projects);
  const capacity_gap = gap * 0.4 * acv; // 40% of gap likely fillable

  const loss_monthly = missed_leads + shared_leads_tax + capacity_gap;

  // Uplift projection
  let uplift = 0.15; // baseline
  if (inp.uses_shared_leads === "yes") uplift += 0.20;
  else if (inp.uses_shared_leads === "sometimes") uplift += 0.10;
  if (closing < 0.20) uplift += 0.15;
  if (gap > 0) uplift += 0.10;
  uplift = Math.min(uplift, 1.2);

  const projected_revenue = Math.max(annual, annual * (1 + uplift) + loss_monthly * 12 * 0.6);

  // Plan recommender
  let recommended_plan: DiagnosticResult["recommended_plan"] = "Pro";
  let plan_reason = "Couverture standard pour entrepreneur en croissance.";
  if (team >= 20 || projected_revenue >= 3_000_000) {
    recommended_plan = "Signature";
    plan_reason = "Structure et potentiel d'envergure — domination de territoire requise.";
  } else if (team >= 10 || projected_revenue >= 1_500_000) {
    recommended_plan = "Élite";
    plan_reason = "Capacité élevée et opportunité majeure de croissance accélérée.";
  } else if (team >= 5 || projected_revenue >= 800_000 || inp.uses_shared_leads === "yes") {
    recommended_plan = "Premium";
    plan_reason = "Idéal pour sortir de la dépendance aux soumissions partagées.";
  } else if (team <= 1 && annual < 200_000) {
    recommended_plan = "Recrue";
    plan_reason = "Démarrage encadré, rendez-vous exclusifs sans risque.";
  }

  return {
    loss_monthly,
    loss_breakdown: { missed_leads, shared_leads_tax, capacity_gap },
    projected_revenue,
    current_revenue: annual,
    uplift_pct: uplift,
    recommended_plan,
    plan_reason,
  };
}

export function planPrice(plan: DiagnosticResult["recommended_plan"]) {
  return PLAN_PRICES[plan];
}
