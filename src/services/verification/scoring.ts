/**
 * UNPRO Verification Engine — Scoring & Verdict Module
 */
import type {
  VerificationScores,
  Verdict,
  VerdictSummary,
  ProbableEntity,
  RegistryValidation,
  VisualExtraction,
  RiskSignal,
  LicenseScope,
} from "./types";

/** Compute visual trust score (0-100) */
export function computeVisualTrustScore(visual: VisualExtraction | null): number {
  if (!visual || !visual.image_type) return 0;

  let score = 30; // base for providing an image
  if (visual.business_name) score += 15;
  if (visual.phone) score += 10;
  if (visual.rbq) score += 20;
  if (visual.website) score += 5;
  if (visual.email) score += 5;
  if (visual.address) score += 5;
  if (visual.neq) score += 10;

  return Math.min(100, score);
}

/** Compute UNPRO trust score (0-100) */
export function computeUnproTrustScore(
  entities: ProbableEntity[],
  registry: RegistryValidation,
  riskSignals: RiskSignal[]
): number {
  const primary = entities[0];
  if (!primary) return 10;

  let score = 0;

  // Identity confidence contribution (max 30)
  score += Math.round((primary.confidence_score / 100) * 30);

  // RBQ status contribution (max 25)
  const rbqScores: Record<string, number> = { valid: 25, expired: 5, suspended: 0, not_found: 5, unknown: 10 };
  score += rbqScores[registry.rbq_status] ?? 10;

  // NEQ status contribution (max 15)
  const neqScores: Record<string, number> = { active: 15, inactive: 3, struck_off: 0, not_found: 5, unknown: 7 };
  score += neqScores[registry.neq_status] ?? 7;

  // Identity coherence (max 15)
  const cohScores: Record<string, number> = { strong: 15, moderate: 10, weak: 4, contradictory: 0, unknown: 6 };
  score += cohScores[registry.identity_coherence] ?? 6;

  // Evidence quantity bonus (max 10)
  score += Math.min(10, primary.evidence.length * 2);

  // Risk penalty (max -5 per signal)
  const penalty = riskSignals.reduce((sum, s) => {
    return sum + (s.severity === "high" ? 8 : s.severity === "medium" ? 4 : 2);
  }, 0);
  score = Math.max(0, score - penalty);

  // Bonus for multiple matching entities confirming same identity
  if (entities.length > 1 && entities[1].confidence_score > 50) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/** Compute all three scores */
export function computeScores(
  entities: ProbableEntity[],
  registry: RegistryValidation,
  visual: VisualExtraction | null,
  riskSignals: RiskSignal[],
  licenseScope: LicenseScope
): VerificationScores {
  return {
    visual_trust_score: computeVisualTrustScore(visual),
    unpro_trust_score: computeUnproTrustScore(entities, registry, riskSignals),
    license_fit_score: licenseScope.license_fit_score,
  };
}

/** Determine final verdict */
export function determineVerdict(scores: VerificationScores, riskSignals: RiskSignal[]): Verdict {
  const highRisks = riskSignals.filter((s) => s.severity === "high").length;
  const { unpro_trust_score } = scores;

  if (highRisks >= 3 || unpro_trust_score < 20) return "se_tenir_loin";
  if (highRisks >= 2 || unpro_trust_score < 40) return "non_succes";
  if (highRisks >= 1 || unpro_trust_score < 65) return "attention";
  return "succes";
}

/** Generate human-readable verdict summary */
export function generateVerdictSummary(
  verdict: Verdict,
  scores: VerificationScores,
  riskSignals: RiskSignal[],
  entities: ProbableEntity[]
): VerdictSummary {
  const businessName = entities[0]?.business_name || "cet entrepreneur";

  const headlines: Record<Verdict, string> = {
    succes: `Identité commerciale cohérente pour ${businessName}`,
    attention: `Points d'attention détectés pour ${businessName}`,
    non_succes: `Signaux préoccupants détectés pour ${businessName}`,
    se_tenir_loin: `Alertes majeures — prudence extrême recommandée`,
  };

  const summaries: Record<Verdict, string> = {
    succes: `Selon les informations disponibles, l'identité commerciale de ${businessName} présente une cohérence satisfaisante. Score de confiance UNPRO : ${scores.unpro_trust_score}/100.`,
    attention: `Certains éléments méritent une vérification complémentaire. ${riskSignals.length} signal(s) de prudence détecté(s). Score de confiance UNPRO : ${scores.unpro_trust_score}/100.`,
    non_succes: `Plusieurs signaux de prudence importants ont été détectés. Vérification complémentaire fortement recommandée avant de procéder. Score de confiance UNPRO : ${scores.unpro_trust_score}/100.`,
    se_tenir_loin: `Des alertes critiques ont été identifiées. Il est fortement recommandé de ne pas procéder avec ${businessName} sans une vérification indépendante approfondie.`,
  };

  const nextStepsMap: Record<Verdict, string[]> = {
    succes: [
      "Demandez un contrat écrit détaillé",
      "Vérifiez la preuve d'assurance responsabilité",
      "Confirmez la licence RBQ sur le site officiel de la RBQ",
    ],
    attention: [
      "Vérifiez la licence RBQ directement sur le site de la RBQ",
      "Demandez des références de clients récents",
      "Exigez un contrat écrit avec portée détaillée des travaux",
      "Comparez avec d'autres entrepreneurs vérifiés sur UNPRO",
    ],
    non_succes: [
      "Vérifiez l'entreprise au Registraire des entreprises du Québec",
      "Contactez la RBQ pour confirmer le statut de la licence",
      "Ne versez aucun dépôt sans contrat écrit et preuve d'assurance",
      "Consultez un autre entrepreneur certifié sur UNPRO",
    ],
    se_tenir_loin: [
      "Ne signez aucun contrat",
      "Ne versez aucun montant",
      "Consultez un entrepreneur vérifié sur UNPRO",
      "Si vous avez déjà signé, consultez un conseiller juridique",
    ],
  };

  return {
    headline: headlines[verdict],
    short_summary: summaries[verdict],
    next_steps: nextStepsMap[verdict],
  };
}
