import type {
  AippAuditViewModel, AippAnalysisStatus, AippConfidence,
  AippCategoryBreakdown, AippSourceStatus, AippBlocker, AippStrength,
} from "@/types/aippReal";

function getScoreLabel(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 90) return "Position très forte";
  if (score >= 75) return "Bonne présence, optimisation possible";
  if (score >= 60) return "Base solide, potentiel bloqué";
  if (score >= 40) return "Visibilité IA faible";
  return "Présence très fragile";
}

const BLOCKER_TRANSLATIONS: Record<string, { title: string; body: string; impact: "low" | "medium" | "high" }> = {
  local_business_schema: {
    title: "Les IA comprennent mal vos services",
    body: "Aucune structure claire n'a été détectée pour décrire votre entreprise.",
    impact: "high",
  },
  service_areas_present: {
    title: "Votre présence locale manque de profondeur",
    body: "Peu de pages semblent dédiées à vos services par ville ou zone desservie.",
    impact: "high",
  },
  primary_cta_visible: {
    title: "Votre conversion mobile semble faible",
    body: "Le chemin pour demander une estimation n'est pas assez rapide ni visible.",
    impact: "medium",
  },
  website_live: {
    title: "Aucun site web détecté",
    body: "Sans site, les IA et les clients potentiels ne peuvent pas vous trouver.",
    impact: "high",
  },
  gbp_found: {
    title: "Aucune fiche Google Business",
    body: "Votre entreprise est invisible sur Google Maps et les recherches locales.",
    impact: "high",
  },
  rbq_valid: {
    title: "Licence RBQ manquante ou invalide",
    body: "Les clients recherchent des professionnels licenciés. Cette absence nuit à la confiance.",
    impact: "high",
  },
  faq_present: {
    title: "Aucune FAQ détectée",
    body: "Les assistants IA ne trouvent pas de réponses directes à donner sur votre entreprise.",
    impact: "medium",
  },
  quote_form_present: {
    title: "Aucun formulaire de soumission",
    body: "Les visiteurs ne peuvent pas facilement demander une estimation.",
    impact: "medium",
  },
};

function mapBlockers(raw: any[]): AippBlocker[] {
  return raw.slice(0, 3).map((b: any) => {
    const translation = BLOCKER_TRANSLATIONS[b.key || b.technical_key];
    return {
      technicalKey: b.key || b.technical_key || "unknown",
      title: translation?.title || b.business_text || b.text || "Signal manquant",
      body: translation?.body || b.text || "",
      impact: translation?.impact || "medium",
      fix: b.fix_text || "Contactez UNPRO pour corriger ce point.",
    };
  });
}

function mapSources(sourcesUsed: string[], analysisStatus: AippAnalysisStatus): AippSourceStatus[] {
  const allSources = [
    { key: "website", label: "Site web" },
    { key: "google", label: "Google Business" },
    { key: "rbq", label: "RBQ" },
    { key: "neq", label: "NEQ" },
    { key: "internal", label: "Profil UNPRO" },
  ];

  return allSources.map(s => ({
    key: s.key,
    label: s.label,
    status: sourcesUsed.includes(s.key)
      ? "validated" as const
      : analysisStatus === "running"
        ? "in_progress" as const
        : "unavailable" as const,
  }));
}

function mapBreakdown(audit: any): AippCategoryBreakdown[] {
  const rawSignals = Array.isArray(audit.raw_signals) ? audit.raw_signals : [];

  function getDetails(group: string): string[] {
    return rawSignals
      .filter((s: any) => s.group === group && !s.found)
      .map((s: any) => s.reason || s.key)
      .slice(0, 4);
  }

  return [
    {
      key: "web" as const, label: "Présence web", score: Number(audit.web_score) || 0, maxScore: 20,
      summary: Number(audit.web_score) >= 15 ? "Votre site envoie de bons signaux." : "Votre site manque d'éléments structurants.",
      details: getDetails("web"),
    },
    {
      key: "google" as const, label: "Présence Google", score: Number(audit.google_score) || 0, maxScore: 20,
      summary: Number(audit.google_score) >= 12 ? "Votre fiche Google inspire confiance." : "Votre fiche Google peut être renforcée.",
      details: getDetails("google"),
    },
    {
      key: "trust" as const, label: "Confiance", score: Number(audit.trust_score) || 0, maxScore: 20,
      summary: Number(audit.trust_score) >= 15 ? "Vos signaux de confiance sont solides." : "Des signaux de confiance manquent.",
      details: getDetails("trust"),
    },
    {
      key: "aiVisibility" as const, label: "Visibilité IA", score: Number(audit.ai_visibility_score) || 0, maxScore: 25,
      summary: Number(audit.ai_visibility_score) >= 18 ? "Les IA comprennent bien votre entreprise." : "Les IA comprennent encore mal vos services.",
      details: getDetails("ai_visibility"),
    },
    {
      key: "conversion" as const, label: "Conversion", score: Number(audit.conversion_score) || 0, maxScore: 15,
      summary: Number(audit.conversion_score) >= 10 ? "Votre site convertit efficacement." : "Votre présence convertit trop lentement.",
      details: getDetails("conversion"),
    },
  ];
}

export function mapAuditToViewModel(audit: any, contractor: any, job?: any): AippAuditViewModel {
  const analysisStatus = (audit?.analysis_status || "pending") as AippAnalysisStatus;
  const overallScore = audit?.overall_score != null ? Number(audit.overall_score) : null;
  const potentialScore = audit?.potential_score != null ? Number(audit.potential_score) : null;

  const rawBlockers = Array.isArray(audit?.blockers) ? audit.blockers : [];
  const rawStrengths = Array.isArray(audit?.strengths) ? audit.strengths : [];
  const sourcesUsed = Array.isArray(audit?.sources_used) ? audit.sources_used : [];

  return {
    auditId: audit?.id || null,
    companyName: contractor?.business_name || "Entreprise",
    overallScore,
    potentialScore,
    statusLabel: getScoreLabel(overallScore),
    analysisStatus,
    confidenceLevel: (audit?.confidence_level || "low") as AippConfidence,
    lastUpdatedAt: audit?.completed_at || audit?.updated_at || null,
    validatedSourcesCount: audit?.validated_sources_count || 0,
    validatedSignalsCount: audit?.validated_signals_count || 0,
    totalPossibleSignalsCount: audit?.total_possible_signals_count || 0,
    sources: mapSources(sourcesUsed, analysisStatus),
    breakdown: audit ? mapBreakdown(audit) : [],
    blockers: mapBlockers(rawBlockers),
    strengths: rawStrengths.slice(0, 5).map((s: any): AippStrength => ({
      title: s.text || s.title || "Signal positif",
      body: s.body,
    })),
    actionPlan: [
      "Structurer votre entreprise pour les IA — Ajouter les signaux que Google et les assistants IA lisent.",
      "Renforcer vos pages de services et vos zones — Créer une présence plus claire par service et territoire.",
      "Accélérer la conversion — Rendre la demande d'estimation plus visible, plus simple et plus rapide.",
    ],
    isProvisional: analysisStatus === "partial",
    rawSignals: Array.isArray(audit?.raw_signals) ? audit.raw_signals : [],
    scoringDetails: audit?.scoring_details,
    jobProgress: job?.progress_percent,
    jobStepKey: job?.step_key,
  };
}
