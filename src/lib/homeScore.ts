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

export interface HomeScoreResult {
  overall_score: number;
  structure_score: number;
  insulation_score: number;
  roof_score: number;
  humidity_score: number;
  windows_score: number;
  heating_score: number;
  electrical_score: number;
  plumbing_score: number;
  confidence_score: number;
}

export interface Recommendation {
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  description: string;
  recommended_timeline: string;
  recommended_profession: string;
}

export function buildRecommendations(score: HomeScoreResult): Recommendation[] {
  const recs: Recommendation[] = [];

  if (score.roof_score < 45) {
    recs.push({
      category: "roof",
      priority: "high",
      title: "Faire inspecter la toiture",
      description:
        "Le score toiture suggère une usure ou un risque plus élevé.",
      recommended_timeline: "0-12 mois",
      recommended_profession: "Couvreur",
    });
  }

  if (score.humidity_score < 50) {
    recs.push({
      category: "humidity",
      priority: "urgent",
      title: "Évaluer l\u2019humidité et la ventilation",
      description:
        "Présence potentielle de condensation, infiltration ou ventilation inadéquate.",
      recommended_timeline: "0-3 mois",
      recommended_profession:
        "Spécialiste en isolation / ventilation / bâtiment",
    });
  }

  if (score.insulation_score < 50) {
    recs.push({
      category: "insulation",
      priority: "medium",
      title: "Améliorer l\u2019isolation",
      description:
        "L\u2019isolation semble insuffisante par rapport au potentiel énergétique du bâtiment.",
      recommended_timeline: "3-12 mois",
      recommended_profession: "Entrepreneur en isolation",
    });
  }

  if (score.windows_score < 50) {
    recs.push({
      category: "windows",
      priority: "medium",
      title: "Remplacer ou améliorer les fenêtres",
      description:
        "Les fenêtres actuelles peuvent causer des pertes énergétiques importantes.",
      recommended_timeline: "6-18 mois",
      recommended_profession: "Entrepreneur en portes et fenêtres",
    });
  }

  if (score.electrical_score < 60) {
    recs.push({
      category: "electrical",
      priority: "high",
      title: "Faire vérifier le système électrique",
      description:
        "Le système électrique pourrait nécessiter une mise à niveau.",
      recommended_timeline: "0-6 mois",
      recommended_profession: "Électricien",
    });
  }

  if (score.plumbing_score < 60) {
    recs.push({
      category: "plumbing",
      priority: "medium",
      title: "Évaluer la plomberie",
      description:
        "La plomberie pourrait bénéficier d\u2019une inspection ou mise à jour.",
      recommended_timeline: "3-12 mois",
      recommended_profession: "Plombier",
    });
  }

  if (score.heating_score < 60) {
    recs.push({
      category: "heating",
      priority: "medium",
      title: "Optimiser le système de chauffage",
      description:
        "Le système de chauffage pourrait être amélioré pour plus d\u2019efficacité.",
      recommended_timeline: "6-12 mois",
      recommended_profession: "Technicien CVAC",
    });
  }

  return recs;
}
