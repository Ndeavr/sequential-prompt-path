/**
 * UNPRO — Contractor Trust Summary Service
 * Aggregates existing trust signals into a public-facing summary.
 */

import { supabase } from "@/integrations/supabase/client";

export interface TrustSignal {
  key: string;
  label_fr: string;
  status: "verified" | "pending" | "missing";
  source?: string;
  checked_at?: string;
  icon: string;
}

export interface TrustSummary {
  contractor_id: string;
  trust_score: number;
  trust_label: string;
  signals: TrustSignal[];
  explanation_fr: string;
  verified_count: number;
  total_checks: number;
}

const TRUST_LABELS: Record<string, string> = {
  excellent: "Confiance élevée",
  good: "Confiance bonne",
  moderate: "Confiance modérée",
  low: "Confiance limitée",
  unknown: "Non évalué",
};

function getTrustLabel(score: number): string {
  if (score >= 80) return TRUST_LABELS.excellent;
  if (score >= 60) return TRUST_LABELS.good;
  if (score >= 40) return TRUST_LABELS.moderate;
  if (score > 0) return TRUST_LABELS.low;
  return TRUST_LABELS.unknown;
}

export async function getContractorTrustSummary(contractorId: string): Promise<TrustSummary> {
  const [credentialsRes, scoresRes, performanceRes, contractorRes] = await Promise.all([
    supabase
      .from("contractor_credentials")
      .select("credential_type, verification_status, verified_at, data_source")
      .eq("contractor_id", contractorId),
    supabase
      .from("contractor_public_scores")
      .select("trust_score, unpro_score, profile_completeness_score")
      .eq("contractor_id", contractorId)
      .maybeSingle(),
    supabase
      .from("contractor_performance_metrics")
      .select("complaint_rate, review_sentiment_score, appointment_show_rate")
      .eq("contractor_id", contractorId)
      .maybeSingle(),
    supabase
      .from("contractors")
      .select("verification_status, rating, review_count, years_experience")
      .eq("id", contractorId)
      .maybeSingle(),
  ]);

  const credentials = credentialsRes.data ?? [];
  const scores = scoresRes.data;
  const perf = performanceRes.data;
  const contractor = contractorRes.data;

  // Build signals from credentials
  const EXPECTED_TYPES = [
    { key: "rbq", label_fr: "Licence RBQ", icon: "shield-check" },
    { key: "neq", label_fr: "Immatriculation NEQ", icon: "building" },
    { key: "insurance", label_fr: "Assurance responsabilité", icon: "shield" },
    { key: "opc", label_fr: "Cautionnement OPC", icon: "lock" },
  ];

  const signals: TrustSignal[] = EXPECTED_TYPES.map((expected) => {
    const cred = credentials.find((c) => c.credential_type === expected.key);
    return {
      key: expected.key,
      label_fr: expected.label_fr,
      status: cred
        ? (cred.verification_status === "verified" ? "verified" : "pending")
        : "missing",
      source: cred?.data_source ?? undefined,
      checked_at: cred?.verified_at ?? undefined,
      icon: expected.icon,
    };
  });

  // Add review intelligence signal
  const reviewSignal: TrustSignal = {
    key: "reviews",
    label_fr: "Avis clients vérifiés",
    status: (contractor?.review_count ?? 0) >= 5 ? "verified" : (contractor?.review_count ?? 0) > 0 ? "pending" : "missing",
    icon: "star",
  };
  signals.push(reviewSignal);

  // Add UNPRO validation signal
  const unproSignal: TrustSignal = {
    key: "unpro_validation",
    label_fr: "Validation UNPRO",
    status: contractor?.verification_status === "verified" ? "verified" : contractor?.verification_status === "pending" ? "pending" : "missing",
    icon: "badge-check",
  };
  signals.push(unproSignal);

  const verified_count = signals.filter((s) => s.status === "verified").length;
  const total_checks = signals.length;
  const trust_score = scores?.trust_score ?? Math.round((verified_count / total_checks) * 100);

  const explanation_fr = generateExplanation(signals, trust_score, perf);

  return {
    contractor_id: contractorId,
    trust_score,
    trust_label: getTrustLabel(trust_score),
    signals,
    explanation_fr,
    verified_count,
    total_checks,
  };
}

function generateExplanation(
  signals: TrustSignal[],
  score: number,
  perf: { complaint_rate?: number | null; review_sentiment_score?: number | null } | null
): string {
  const verified = signals.filter((s) => s.status === "verified").map((s) => s.label_fr);
  const missing = signals.filter((s) => s.status === "missing").map((s) => s.label_fr);

  let text = "";
  if (verified.length > 0) {
    text += `Cet entrepreneur a ${verified.length} vérification${verified.length > 1 ? "s" : ""} confirmée${verified.length > 1 ? "s" : ""}: ${verified.join(", ")}. `;
  }
  if (missing.length > 0) {
    text += `${missing.length} vérification${missing.length > 1 ? "s" : ""} en attente: ${missing.join(", ")}. `;
  }
  if (perf?.complaint_rate != null && perf.complaint_rate < 0.05) {
    text += "Taux de plaintes très faible. ";
  }
  if (score >= 80) {
    text += "Profil de confiance élevé.";
  } else if (score >= 60) {
    text += "Bon niveau de confiance global.";
  } else {
    text += "Des vérifications supplémentaires renforceraient la confiance.";
  }

  return text.trim();
}
