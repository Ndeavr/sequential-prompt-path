/**
 * UNPRO — Certification Service
 * Manages UnPRO Certified Home lifecycle.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CertificationEvaluation {
  eligible: boolean;
  status: string;
  passportCompletion: number;
  documentQuality: number;
  dataConfidence: number;
  contributionCount: number;
  reasons: string[];
}

/**
 * Evaluate certification eligibility for a property.
 * Does NOT write to DB — pure evaluation.
 */
export async function evaluateCertification(propertyId: string): Promise<CertificationEvaluation> {
  const reasons: string[] = [];

  // Fetch passport sections
  const { data: sections } = await supabase
    .from("property_passport_sections")
    .select("completion_pct, section_key")
    .eq("property_id", propertyId);

  const sectionCount = sections?.length || 0;
  const avgCompletion = sectionCount > 0
    ? Math.round((sections || []).reduce((s, sec) => s + ((sec.completion_pct as number) || 0), 0) / sectionCount)
    : 0;

  if (avgCompletion < 70) {
    reasons.push("Passeport complété à moins de 70%");
  }

  // Fetch document count
  const { count: docCount } = await supabase
    .from("property_events")
    .select("*", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .eq("event_type", "document_upload");

  const documentQuality = Math.min(100, (docCount || 0) * 20);
  if (documentQuality < 40) {
    reasons.push("Pas assez de documents téléversés");
  }

  // Fetch approved contributions
  const { count: contribCount } = await supabase
    .from("contractor_contributions")
    .select("*", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .eq("status", "approved");

  // Fetch completion tasks
  const { data: tasks } = await supabase
    .from("property_completion_tasks")
    .select("status")
    .eq("property_id", propertyId);

  const completedTasks = (tasks || []).filter(t => t.status === "completed").length;
  const totalTasks = (tasks || []).length;
  const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const dataConfidence = Math.round((avgCompletion * 0.5) + (taskPct * 0.3) + (documentQuality * 0.2));

  if (dataConfidence < 60) {
    reasons.push("Niveau de confiance des données insuffisant");
  }

  const eligible = avgCompletion >= 70 && documentQuality >= 40 && dataConfidence >= 60;

  return {
    eligible,
    status: eligible ? "eligible" : "not_eligible",
    passportCompletion: avgCompletion,
    documentQuality,
    dataConfidence,
    contributionCount: contribCount || 0,
    reasons,
  };
}

/**
 * Request certification review (writes to DB).
 */
export async function requestCertificationReview(propertyId: string) {
  const evaluation = await evaluateCertification(propertyId);

  if (!evaluation.eligible) {
    throw new Error("La propriété n'est pas encore éligible à la certification.");
  }

  const { data, error } = await supabase
    .from("certification_reviews")
    .insert({
      property_id: propertyId,
      certification_status: "in_review",
      passport_completion_pct: evaluation.passportCompletion,
      document_quality_score: evaluation.documentQuality,
      data_confidence_score: evaluation.dataConfidence,
      contribution_count: evaluation.contributionCount,
    })
    .select()
    .single();

  if (error) throw error;

  // Update property quick lookup
  await supabase
    .from("properties")
    .update({ certification_status: "in_review" })
    .eq("id", propertyId);

  return data;
}

/**
 * Get latest certification for a property.
 */
export async function getLatestCertification(propertyId: string) {
  const { data, error } = await supabase
    .from("certification_reviews")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
