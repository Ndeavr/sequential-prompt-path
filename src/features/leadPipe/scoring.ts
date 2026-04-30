/**
 * UNPRO — Lead Pipe Risk Scoring (déterministe)
 * Basé sur ville, année construction, type bâtiment, quartier.
 */

export interface ScoringInput {
  cityRiskIndex?: number | null;
  neighborhoodRiskIndex?: number | null;
  yearBuilt?: number | null;
  propertyType?: string | null;
  publicLeadServiceEstimated?: boolean;
}

export interface ScoringFactor {
  label: string;
  weight: number;
  detail?: string;
}

export interface ScoringResult {
  score: number; // 0-100
  riskLevel: "Faible" | "Modéré" | "Élevé";
  factors: ScoringFactor[];
  recommendedActions: string[];
}

const TYPE_WEIGHT: Record<string, number> = {
  triplex: 12,
  duplex: 10,
  quadruplex: 12,
  multiplex: 12,
  maison: 5,
  unifamiliale: 5,
  condo: 4,
  appartement: 6,
};

export function computeLeadPipeScore(input: ScoringInput): ScoringResult {
  const factors: ScoringFactor[] = [];
  let raw = 0;

  // 1. City baseline (0-40)
  const city = Math.max(0, Math.min(100, input.cityRiskIndex ?? 50));
  const cityContribution = Math.round(city * 0.4);
  raw += cityContribution;
  factors.push({
    label: "Risque géographique (ville)",
    weight: cityContribution,
    detail: `Indice ville ${city}/100`,
  });

  // 2. Neighborhood (0-15) override boost
  if (input.neighborhoodRiskIndex != null) {
    const n = Math.max(0, Math.min(100, input.neighborhoodRiskIndex));
    const nContribution = Math.round((n - 50) * 0.15);
    raw += nContribution;
    factors.push({
      label: "Quartier historique",
      weight: nContribution,
      detail: `Indice quartier ${n}/100`,
    });
  }

  // 3. Year built (0-30)
  if (input.yearBuilt && input.yearBuilt > 1800) {
    const y = input.yearBuilt;
    let yContribution = 0;
    let detail = "";
    if (y < 1950) { yContribution = 30; detail = "Construit avant 1950"; }
    else if (y < 1970) { yContribution = 22; detail = "Construit avant 1970"; }
    else if (y < 1986) { yContribution = 12; detail = "Construit avant 1986"; }
    else if (y < 2000) { yContribution = 5; detail = "Construit avant 2000"; }
    else { yContribution = 0; detail = "Construction récente"; }
    raw += yContribution;
    factors.push({ label: "Année de construction", weight: yContribution, detail });
  } else {
    raw += 8;
    factors.push({ label: "Année de construction inconnue", weight: 8, detail: "Hypothèse prudente" });
  }

  // 4. Property type
  const t = (input.propertyType ?? "").toLowerCase();
  for (const key of Object.keys(TYPE_WEIGHT)) {
    if (t.includes(key)) {
      raw += TYPE_WEIGHT[key];
      factors.push({
        label: `Type de bâtiment (${key})`,
        weight: TYPE_WEIGHT[key],
        detail: t.includes("plex") ? "Plex souvent legacy" : undefined,
      });
      break;
    }
  }

  // 5. Public lead service
  if (input.publicLeadServiceEstimated) {
    raw += 8;
    factors.push({
      label: "Conduite publique potentiellement en plomb",
      weight: 8,
      detail: "Selon données municipales",
    });
  }

  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const riskLevel: ScoringResult["riskLevel"] =
    score >= 70 ? "Élevé" : score >= 45 ? "Modéré" : "Faible";

  const recommendedActions: string[] = [];
  if (score >= 70) {
    recommendedActions.push("Test d'eau certifié recommandé rapidement");
    recommendedActions.push("Inspection visuelle de la plomberie par un plombier UNPRO");
    recommendedActions.push("Évaluer remplacement partiel des conduites");
  } else if (score >= 45) {
    recommendedActions.push("Test d'eau préventif recommandé");
    recommendedActions.push("Inspection visuelle de la tuyauterie d'entrée");
  } else {
    recommendedActions.push("Test d'eau si doute personnel");
    recommendedActions.push("Surveillance lors de rénovations futures");
  }

  return { score, riskLevel, factors, recommendedActions };
}
