/**
 * UNPRO — Property Insight Service
 * Generates deterministic insights and improvement opportunities from property data.
 */

export interface PropertyInsight {
  type: "maintenance" | "energy" | "renovation" | "risk";
  title: string;
  description: string;
  urgency: "low" | "medium" | "high";
  contractorCategory?: string;
}

const currentYear = new Date().getFullYear();

interface PropertyData {
  yearBuilt?: number | null;
  propertyType?: string | null;
  condition?: string | null;
  squareFootage?: number | null;
  renovationCount: number;
  hasInspectionReports: boolean;
  quoteCount: number;
}

export function generatePropertyInsights(data: PropertyData): PropertyInsight[] {
  const insights: PropertyInsight[] = [];
  const age = data.yearBuilt ? currentYear - data.yearBuilt : null;

  // Roof inspection
  if (age && age > 20) {
    insights.push({
      type: "maintenance",
      title: "Inspection de toiture recommandée",
      description: `Votre propriété a ${age} ans. Une inspection de toiture est recommandée tous les 20 ans.`,
      urgency: age > 35 ? "high" : "medium",
      contractorCategory: "Couvreur",
    });
  }

  // Foundation check
  if (age && age > 40) {
    insights.push({
      type: "risk",
      title: "Vérification des fondations",
      description: "Les propriétés de plus de 40 ans peuvent présenter des signes d'usure au niveau des fondations.",
      urgency: age > 60 ? "high" : "medium",
      contractorCategory: "Maçonnerie / Fondations",
    });
  }

  // Insulation
  if (age && age > 25) {
    insights.push({
      type: "energy",
      title: "Isolation potentiellement insuffisante",
      description: "Les normes d'isolation ont évolué. Une évaluation énergétique pourrait révéler des économies.",
      urgency: "medium",
      contractorCategory: "Isolation",
    });
  }

  // Windows
  if (age && age > 30) {
    insights.push({
      type: "energy",
      title: "Fenêtres possiblement énergivores",
      description: "Les fenêtres de plus de 30 ans perdent souvent leur efficacité thermique.",
      urgency: age > 40 ? "high" : "medium",
      contractorCategory: "Portes et fenêtres",
    });
  }

  // Plumbing
  if (age && age > 35) {
    insights.push({
      type: "maintenance",
      title: "Plomberie à vérifier",
      description: "Les systèmes de plomberie de plus de 35 ans méritent une inspection préventive.",
      urgency: "medium",
      contractorCategory: "Plombier",
    });
  }

  // Electrical
  if (age && age > 30) {
    insights.push({
      type: "risk",
      title: "Système électrique à évaluer",
      description: "Le panneau électrique et le câblage pourraient nécessiter une mise à niveau.",
      urgency: age > 45 ? "high" : "medium",
      contractorCategory: "Électricien",
    });
  }

  // Condition-based
  if (data.condition === "poor" || data.condition === "critical") {
    insights.push({
      type: "renovation",
      title: "Rénovation générale recommandée",
      description: `La condition de votre propriété est évaluée comme "${data.condition === "critical" ? "critique" : "faible"}". Des travaux de rénovation sont conseillés.`,
      urgency: "high",
      contractorCategory: "Entrepreneur général",
    });
  }

  // No inspection report
  if (!data.hasInspectionReports) {
    insights.push({
      type: "maintenance",
      title: "Rapport d'inspection manquant",
      description: "Aucun rapport d'inspection n'est disponible. Un rapport permettrait une évaluation plus précise.",
      urgency: "low",
      contractorCategory: "Inspecteur en bâtiment",
    });
  }

  // No renovations recorded
  if (data.renovationCount === 0 && age && age > 15) {
    insights.push({
      type: "renovation",
      title: "Aucune rénovation enregistrée",
      description: "Aucune rénovation n'a été enregistrée. Documentez vos travaux pour améliorer votre score.",
      urgency: "low",
    });
  }

  return insights;
}
