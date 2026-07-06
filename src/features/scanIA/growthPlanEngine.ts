/**
 * Deterministic growth plan engine — no LLM.
 * Turns a scan report + user goal + declared capacity into 3 ranked recommendations
 * and picks a matching contractor plan slug.
 */
import { avgTicketFor } from "@/config/scanCapacityTickets";

export type BusinessGoal =
  | "grow_revenue"
  | "fill_schedule"
  | "increase_profit"
  | "expand_territory"
  | "become_leader"
  | "recruit_team";

export interface TerritoryDemandRow {
  city: string;
  waiting_homeowners: number;
  heat_level?: "high" | "growing" | "emerging";
}

export interface GrowthRecommendation {
  rank: number;
  title: string;
  detail: string;
  annual_value_cad: number;
  accent: "emerald" | "sky" | "amber";
}

export interface ScanReportLike {
  business_name: string | null;
  city: string | null;
  category: string | null;
  territory_demand: TerritoryDemandRow[];
  opportunities: { estimated_revenue?: number } | null;
}

export function buildGrowthPlan(
  report: ScanReportLike,
  goal: BusinessGoal,
  capacity: number,
): GrowthRecommendation[] {
  const territory = Array.isArray(report.territory_demand) ? report.territory_demand : [];
  const category = report.category ?? "Rénovation";
  const ticket = avgTicketFor(category);
  const opportunity = Number(report.opportunities?.estimated_revenue ?? 0);

  const top = territory[0];
  const second = territory[1];

  const capturedProjects = Math.min(capacity, top?.waiting_homeowners ?? capacity);
  const capturedValue = Math.round(capturedProjects * ticket * 0.8); // 80% conversion

  const expandProjects = Math.min(Math.round(capacity / 2), second?.waiting_homeowners ?? 4);
  const expandValue = Math.round(expandProjects * ticket * 0.6);

  const matchingValue = Math.round(Math.max(opportunity * 0.5, capacity * ticket * 4));

  const recs: GrowthRecommendation[] = [
    {
      rank: 1,
      title: top ? `Capturer la demande à ${top.city}` : "Capturer la demande locale",
      detail: top
        ? `${top.waiting_homeowners} propriétaires en attente · ${category}`
        : "Rendez-vous prioritaires dans votre secteur",
      annual_value_cad: capturedValue || Math.round(opportunity * 0.4),
      accent: "emerald",
    },
    {
      rank: 2,
      title: second ? `Étendre à ${second.city}` : "Étendre votre couverture",
      detail: second
        ? `${second.waiting_homeowners} propriétaires additionnels`
        : "Ouvrir une ville adjacente à forte demande",
      annual_value_cad: expandValue || Math.round(opportunity * 0.25),
      accent: "sky",
    },
    {
      rank: 3,
      title: "Matching propriétaires (IA)",
      detail: "Rendez-vous exclusifs, qualifiés, livrés par Alex",
      annual_value_cad: matchingValue,
      accent: "amber",
    },
  ];

  // Re-rank by value so top rec is always the biggest lever
  recs.sort((a, b) => b.annual_value_cad - a.annual_value_cad);
  return recs.map((r, i) => ({ ...r, rank: i + 1 }));
}

export type RecommendedPlanSlug = "recrue" | "pro" | "premium" | "elite" | "signature";

export function pickRecommendedPlan(annualOpportunity: number): RecommendedPlanSlug {
  if (annualOpportunity >= 1_000_000) return "signature";
  if (annualOpportunity >= 500_000) return "elite";
  if (annualOpportunity >= 200_000) return "premium";
  if (annualOpportunity >= 100_000) return "pro";
  return "recrue";
}

export const GOAL_LABELS: Record<BusinessGoal, { title: string; hint: string }> = {
  grow_revenue: { title: "Augmenter mes revenus", hint: "Plus de contrats à haute valeur" },
  fill_schedule: { title: "Remplir mon calendrier", hint: "Éliminer les trous entre projets" },
  increase_profit: { title: "Améliorer ma rentabilité", hint: "Contrats mieux qualifiés" },
  expand_territory: { title: "Étendre mon territoire", hint: "Nouvelles villes prioritaires" },
  become_leader: { title: "Devenir leader du marché", hint: "Dominer votre catégorie" },
  recruit_team: { title: "Recruter une équipe", hint: "Développer votre capacité" },
};
