/**
 * UNPRO — Digital Twin Prediction Service
 * Generates deterministic property predictions based on component age and condition.
 */
import { supabase } from "@/integrations/supabase/client";

export interface Prediction {
  id?: string;
  prediction_type: string;
  title_fr: string;
  explanation_fr: string;
  probability_score: number;
  predicted_year: number;
  cost_min: number;
  cost_max: number;
  source_confidence: "high" | "medium" | "low";
  urgency: "low" | "medium" | "high";
  category: string;
}

interface PredictionInput {
  yearBuilt?: number | null;
  roofYear?: number | null;
  windowsYear?: number | null;
  heatingType?: string | null;
  plumbingYear?: number | null;
  insulationType?: string | null;
  condition?: string | null;
  squareFootage?: number | null;
}

const currentYear = new Date().getFullYear();

/**
 * Generate predictions deterministically from property data.
 */
export function generatePredictions(input: PredictionInput): Prediction[] {
  const predictions: Prediction[] = [];
  const sqft = input.squareFootage || 1200;

  // Roof replacement
  const roofAge = input.roofYear ? currentYear - input.roofYear : input.yearBuilt ? currentYear - input.yearBuilt : null;
  if (roofAge != null) {
    const remainingLife = Math.max(0, 25 - roofAge);
    const probability = roofAge >= 20 ? 85 : roofAge >= 15 ? 60 : 30;
    if (probability >= 30) {
      predictions.push({
        prediction_type: "roof_replacement",
        title_fr: "Remplacement de la toiture probable",
        explanation_fr: `Toiture estimée à ${roofAge} ans. Durée de vie typique : 20-30 ans. ${remainingLife <= 5 ? "Remplacement à prévoir sous peu." : `Vie utile restante estimée : ~${remainingLife} ans.`}`,
        probability_score: probability,
        predicted_year: currentYear + remainingLife,
        cost_min: Math.round(sqft * 3.5),
        cost_max: Math.round(sqft * 7),
        source_confidence: input.roofYear ? "high" : "low",
        urgency: remainingLife <= 3 ? "high" : remainingLife <= 8 ? "medium" : "low",
        category: "toiture",
      });
    }
  }

  // Windows replacement
  const windowAge = input.windowsYear ? currentYear - input.windowsYear : null;
  if (windowAge != null && windowAge > 15) {
    const remainingLife = Math.max(0, 30 - windowAge);
    predictions.push({
      prediction_type: "windows_replacement",
      title_fr: "Remplacement des fenêtres à envisager",
      explanation_fr: `Fenêtres estimées à ${windowAge} ans. Durée de vie typique : 25-35 ans. Des fenêtres inefficaces augmentent les coûts de chauffage.`,
      probability_score: windowAge >= 25 ? 80 : 50,
      predicted_year: currentYear + remainingLife,
      cost_min: 8000,
      cost_max: 25000,
      source_confidence: "high",
      urgency: remainingLife <= 5 ? "high" : "medium",
      category: "fenêtres",
    });
  }

  // Insulation upgrade
  const buildAge = input.yearBuilt ? currentYear - input.yearBuilt : null;
  if (buildAge && buildAge > 25 && !input.insulationType) {
    predictions.push({
      prediction_type: "insulation_upgrade",
      title_fr: "Amélioration de l'isolation recommandée",
      explanation_fr: `Propriété de ${buildAge} ans sans données d'isolation. Les normes ont évolué — une évaluation pourrait révéler d'importantes économies d'énergie.`,
      probability_score: 65,
      predicted_year: currentYear + 2,
      cost_min: 3000,
      cost_max: 12000,
      source_confidence: "low",
      urgency: buildAge > 40 ? "high" : "medium",
      category: "énergie",
    });
  }

  // Heating upgrade
  if (buildAge && buildAge > 20 && input.heatingType === "electric_baseboard") {
    predictions.push({
      prediction_type: "heating_upgrade",
      title_fr: "Mise à niveau du système de chauffage",
      explanation_fr: "Les plinthes électriques consomment plus que les thermopompes modernes. Une mise à niveau pourrait réduire vos coûts de 30-50%.",
      probability_score: 70,
      predicted_year: currentYear + 3,
      cost_min: 5000,
      cost_max: 18000,
      source_confidence: input.heatingType ? "high" : "low",
      urgency: "medium",
      category: "chauffage",
    });
  }

  // Plumbing maintenance
  const plumbAge = input.plumbingYear ? currentYear - input.plumbingYear : null;
  if (plumbAge != null && plumbAge > 30) {
    predictions.push({
      prediction_type: "plumbing_maintenance",
      title_fr: "Risque de défaillance de plomberie",
      explanation_fr: `Plomberie estimée à ${plumbAge} ans. Les tuyaux de cuivre et les joints vieillissants peuvent causer des fuites coûteuses.`,
      probability_score: plumbAge > 40 ? 75 : 50,
      predicted_year: currentYear + Math.max(0, 45 - plumbAge),
      cost_min: 2000,
      cost_max: 15000,
      source_confidence: "high",
      urgency: plumbAge > 40 ? "high" : "medium",
      category: "plomberie",
    });
  }

  // Foundation monitoring
  if (buildAge && buildAge > 50) {
    predictions.push({
      prediction_type: "foundation_monitoring",
      title_fr: "Surveillance des fondations recommandée",
      explanation_fr: `Propriété de ${buildAge} ans. Les fondations peuvent montrer des signes de fissuration ou d'infiltration d'eau.`,
      probability_score: buildAge > 70 ? 70 : 40,
      predicted_year: currentYear + 1,
      cost_min: 500,
      cost_max: 25000,
      source_confidence: input.condition ? "medium" : "low",
      urgency: buildAge > 70 ? "high" : "medium",
      category: "fondation",
    });
  }

  return predictions.sort((a, b) => b.probability_score - a.probability_score);
}

/**
 * Save predictions to the database (replace existing).
 */
export async function savePredictions(propertyId: string, predictions: Prediction[]) {
  // Deactivate old predictions
  await supabase
    .from("property_predictions")
    .update({ is_active: false })
    .eq("property_id", propertyId);

  if (predictions.length === 0) return;

  const rows = predictions.map((p) => ({
    property_id: propertyId,
    ...p,
    is_active: true,
  }));

  const { error } = await supabase.from("property_predictions").insert(rows);
  if (error) throw error;
}

/**
 * Get active predictions for a property.
 */
export async function getPropertyPredictions(propertyId: string) {
  const { data, error } = await supabase
    .from("property_predictions")
    .select("*")
    .eq("property_id", propertyId)
    .eq("is_active", true)
    .order("probability_score", { ascending: false });

  if (error) throw error;
  return data || [];
}
