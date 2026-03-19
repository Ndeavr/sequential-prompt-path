import type { PropertyScoreResult } from "./property-score.ts";

export type RecommendationInsert = {
  category: string;
  priority: string;
  title: string;
  description: string;
  recommended_timeline: string;
  estimated_cost_min: number | null;
  estimated_cost_max: number | null;
  recommended_profession: string | null;
  reasoning: Record<string, unknown>;
  source: string;
};

export function buildRecommendations(
  score: PropertyScoreResult,
): RecommendationInsert[] {
  const recs: RecommendationInsert[] = [];
  const cs = score.component_scores;

  if (cs.roof < 45) {
    recs.push({
      category: "roof",
      priority: "high",
      title: "Faire inspecter la toiture",
      description:
        "Le score de toiture indique un niveau d\u2019usure ou de risque plus \u00e9lev\u00e9 que souhait\u00e9.",
      recommended_timeline: "0 \u00e0 12 mois",
      estimated_cost_min: 350,
      estimated_cost_max: 1500,
      recommended_profession: "Couvreur",
      reasoning: { trigger: "roof_score", value: cs.roof, threshold: 45 },
      source: "system",
    });
  }

  if (cs.humidity < 50) {
    recs.push({
      category: "humidity",
      priority: "urgent",
      title: "\u00c9valuer l\u2019humidit\u00e9 et la ventilation",
      description:
        "Le profil du b\u00e2timent sugg\u00e8re un risque de condensation, d\u2019infiltration ou de ventilation inad\u00e9quate.",
      recommended_timeline: "0 \u00e0 3 mois",
      estimated_cost_min: 250,
      estimated_cost_max: 2500,
      recommended_profession:
        "Sp\u00e9cialiste en b\u00e2timent / isolation / ventilation",
      reasoning: {
        trigger: "humidity_score",
        value: cs.humidity,
        threshold: 50,
      },
      source: "system",
    });
  }

  if (cs.insulation < 50) {
    recs.push({
      category: "insulation",
      priority: "medium",
      title: "Am\u00e9liorer l\u2019isolation",
      description:
        "L\u2019isolation actuelle semble sous-optimale pour la performance \u00e9nerg\u00e9tique du b\u00e2timent.",
      recommended_timeline: "3 \u00e0 12 mois",
      estimated_cost_min: 1500,
      estimated_cost_max: 8000,
      recommended_profession: "Entrepreneur en isolation",
      reasoning: {
        trigger: "insulation_score",
        value: cs.insulation,
        threshold: 50,
      },
      source: "system",
    });
  }

  if (cs.windows < 50) {
    recs.push({
      category: "windows",
      priority: "medium",
      title: "Faire v\u00e9rifier l\u2019\u00e9tat des fen\u00eatres",
      description:
        "Les fen\u00eatres pourraient nuire au confort, \u00e0 l\u2019\u00e9tanch\u00e9it\u00e9 et \u00e0 l\u2019efficacit\u00e9 \u00e9nerg\u00e9tique.",
      recommended_timeline: "6 \u00e0 18 mois",
      estimated_cost_min: 1200,
      estimated_cost_max: 18000,
      recommended_profession: "Entrepreneur en portes et fen\u00eatres",
      reasoning: {
        trigger: "windows_score",
        value: cs.windows,
        threshold: 50,
      },
      source: "system",
    });
  }

  if (cs.electrical < 55) {
    recs.push({
      category: "electrical",
      priority: "high",
      title: "Faire \u00e9valuer le syst\u00e8me \u00e9lectrique",
      description:
        "Une mise \u00e0 niveau \u00e9lectrique pourrait \u00eatre requise selon l\u2019\u00e2ge ou l\u2019\u00e9tat du b\u00e2timent.",
      recommended_timeline: "0 \u00e0 12 mois",
      estimated_cost_min: 300,
      estimated_cost_max: 6000,
      recommended_profession: "\u00c9lectricien",
      reasoning: {
        trigger: "electrical_score",
        value: cs.electrical,
        threshold: 55,
      },
      source: "system",
    });
  }

  if (cs.plumbing < 55) {
    recs.push({
      category: "plumbing",
      priority: "medium",
      title: "Faire inspecter la plomberie",
      description:
        "Le b\u00e2timent pourrait b\u00e9n\u00e9ficier d\u2019une v\u00e9rification de la plomberie ou de certains remplacements.",
      recommended_timeline: "3 \u00e0 12 mois",
      estimated_cost_min: 250,
      estimated_cost_max: 5000,
      recommended_profession: "Plombier",
      reasoning: {
        trigger: "plumbing_score",
        value: cs.plumbing,
        threshold: 55,
      },
      source: "system",
    });
  }

  if (score.overall_score >= 80) {
    recs.push({
      category: "maintenance",
      priority: "low",
      title: "Maintenir le bon \u00e9tat g\u00e9n\u00e9ral du b\u00e2timent",
      description:
        "Le score global est bon. Conservez une routine pr\u00e9ventive avec entretien document\u00e9.",
      recommended_timeline: "Continu",
      estimated_cost_min: null,
      estimated_cost_max: null,
      recommended_profession: "Entretien pr\u00e9ventif",
      reasoning: {
        trigger: "overall_score",
        value: score.overall_score,
        threshold: 80,
      },
      source: "system",
    });
  }

  return recs;
}
