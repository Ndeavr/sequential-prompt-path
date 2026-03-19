/**
 * UNPRO — Recommendation-to-Lead Service
 * Creates a lead from a property recommendation.
 */
import { supabase } from "@/integrations/supabase/client";

interface CreateLeadFromRecommendationInput {
  userId: string;
  propertyId: string;
  recommendationId: string;
  city: string;
  category: string;
  specialty: string;
  budgetMin: number;
  budgetMax: number;
  urgency: string;
  language?: string;
  seriousnessScore?: number;
}

export async function createLeadFromRecommendation(
  input: CreateLeadFromRecommendationInput,
) {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      owner_profile_id: input.userId,
      property_id: input.propertyId,
      lead_type: "contractor" as const,
      city: input.city,
      intent: "improve_home",
      project_category: input.category,
      specialty_needed: input.specialty,
      budget_min: input.budgetMin,
      budget_max: input.budgetMax,
      urgency: input.urgency,
      language: input.language || "fr",
      seriousness_score: input.seriousnessScore || 75,
      payload: {
        source: "property_recommendation",
        recommendation_id: input.recommendationId,
      },
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
