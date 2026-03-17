/**
 * UNPRO — Contractor Engine Service
 * Core business logic for project matching, scope coverage, smart decline, and team building.
 */

import type {
  IncomingProject,
  MatchType,
  ScopeCoverage,
  MatchReason,
  ProjectFlag,
  ExpertisePreview,
  ExpertiseExample,
  ContractorCapability,
  ContractorExclusion,
} from "@/types/contractorEngine";

// ─── Scope Coverage Calculator ───
export function computeScopeCoverage(
  projectSlugs: string[],
  capabilities: ContractorCapability[],
  exclusions: ContractorExclusion[]
): ScopeCoverage {
  const capSlugs = new Set(
    capabilities.filter(c => c.is_active).flatMap(c => [c.service_slug, c.category_slug, c.material_slug].filter(Boolean))
  );
  const exclSlugs = new Set(
    exclusions.filter(e => e.is_active).flatMap(e => [e.service_slug, e.category_slug, e.material_slug].filter(Boolean))
  );

  const inScope: string[] = [];
  const outOfScope: string[] = [];

  for (const slug of projectSlugs) {
    if (exclSlugs.has(slug)) {
      outOfScope.push(slug);
    } else if (capSlugs.has(slug)) {
      inScope.push(slug);
    } else {
      outOfScope.push(slug);
    }
  }

  const total = projectSlugs.length || 1;
  return {
    in_scope: inScope,
    out_of_scope: outOfScope,
    coverage_percent: Math.round((inScope.length / total) * 100),
  };
}

// ─── Match Type Classifier ───
export function classifyMatchType(coverage: ScopeCoverage): MatchType {
  if (coverage.coverage_percent >= 90) return "perfect";
  if (coverage.coverage_percent >= 50) return "partial";
  return "subcontract_needed";
}

// ─── Project Flags Generator ───
export function generateProjectFlags(
  matchType: MatchType,
  urgencyLevel: string,
  estimatedValue?: number
): ProjectFlag[] {
  const flags: ProjectFlag[] = [];

  if (matchType === "perfect") {
    flags.push({ type: "perfect_match", label_fr: "Match parfait", color: "success" });
  } else if (matchType === "partial") {
    flags.push({ type: "partial_match", label_fr: "Match partiel", color: "warning" });
  } else {
    flags.push({ type: "subcontract_needed", label_fr: "Sous-traitance requise", color: "destructive" });
  }

  if (urgencyLevel === "urgent") {
    flags.push({ type: "high_urgency", label_fr: "Urgence élevée", color: "destructive" });
  }

  if (estimatedValue && estimatedValue > 2000000) {
    flags.push({ type: "high_value", label_fr: "Projet haute valeur", color: "primary" });
  }

  return flags;
}

// ─── Match Reasons Generator ───
export function generateMatchReasons(
  coverage: ScopeCoverage,
  matchScore: number,
  city?: string,
  contractorCity?: string
): MatchReason[] {
  const reasons: MatchReason[] = [];

  if (coverage.coverage_percent >= 90) {
    reasons.push({ icon: "check-circle", text_fr: "Toutes les compétences requises sont couvertes", impact: "positive" });
  } else if (coverage.coverage_percent >= 50) {
    reasons.push({ icon: "alert-circle", text_fr: `${coverage.in_scope.length} compétences couvertes sur ${coverage.in_scope.length + coverage.out_of_scope.length}`, impact: "neutral" });
  }

  if (matchScore >= 80) {
    reasons.push({ icon: "star", text_fr: "Score de compatibilité excellent", impact: "positive" });
  }

  if (city && contractorCity && city.toLowerCase() === contractorCity.toLowerCase()) {
    reasons.push({ icon: "map-pin", text_fr: "Même ville que votre bureau", impact: "positive" });
  }

  if (coverage.out_of_scope.length > 0) {
    reasons.push({ icon: "alert-triangle", text_fr: `${coverage.out_of_scope.length} éléments hors champ d'expertise`, impact: "negative" });
  }

  return reasons;
}

// ─── Expertise Preview (real-time impact) ───
export function generateExpertisePreview(
  capabilities: ContractorCapability[],
  exclusions: ContractorExclusion[]
): ExpertisePreview {
  const included: ExpertiseExample[] = capabilities
    .filter(c => c.is_active)
    .slice(0, 6)
    .map(c => ({
      label_fr: c.service_slug || c.category_slug || c.material_slug || "Service",
      reason_fr: "Correspond à vos compétences déclarées",
      category_slug: c.category_slug || undefined,
    }));

  const excluded: ExpertiseExample[] = exclusions
    .filter(e => e.is_active)
    .slice(0, 6)
    .map(e => ({
      label_fr: e.service_slug || e.category_slug || e.material_slug || "Service",
      reason_fr: e.reason_fr || "Exclu de vos compétences",
      category_slug: e.category_slug || undefined,
    }));

  return { included_examples: included, excluded_examples: excluded };
}

// ─── Enrichment: Build IncomingProject from raw data ───
export function enrichIncomingProject(
  lead: any,
  capabilities: ContractorCapability[],
  exclusions: ContractorExclusion[],
  contractorCity?: string
): IncomingProject {
  const projectSlugs: string[] = [];
  if (lead.project_category) projectSlugs.push(lead.project_category);

  const coverage = computeScopeCoverage(projectSlugs, capabilities, exclusions);
  const matchType = classifyMatchType(coverage);
  const flags = generateProjectFlags(matchType, lead.urgency_level || "normal", lead.estimated_value_cents);
  const reasons = generateMatchReasons(coverage, lead.score || 0, lead.city, contractorCity);

  return {
    id: lead.id,
    appointment_id: lead.appointments?.id,
    project_category: lead.project_category || "Projet",
    city: lead.city || lead.appointments?.properties?.city || "",
    match_score: lead.score || 0,
    match_type: matchType,
    ai_summary_fr: generateAISummary(lead),
    urgency_level: lead.urgency_level || "normal",
    estimated_value_cents: lead.estimated_value_cents,
    budget_range: lead.budget_range,
    timeline: lead.timeline,
    preferred_date: lead.appointments?.preferred_date,
    scope_coverage: coverage,
    match_reasons: reasons,
    flags,
    created_at: lead.created_at,
  };
}

function generateAISummary(lead: any): string {
  const parts: string[] = [];
  if (lead.project_category) parts.push(`Projet de ${lead.project_category.toLowerCase()}`);
  if (lead.city) parts.push(`à ${lead.city}`);
  if (lead.budget_range) parts.push(`· Budget : ${lead.budget_range}`);
  if (lead.timeline) parts.push(`· Échéancier : ${lead.timeline}`);
  return parts.join(" ") || "Nouveau projet";
}
