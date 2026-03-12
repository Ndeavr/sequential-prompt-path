/**
 * UNPRO — CCAI Engine (Contractor-Client Alignment Index)
 * Pure computation logic for the 25-question alignment system.
 */

// ─── Types ───

export type CCAICategory =
  | "language_communication"
  | "involvement_complexity"
  | "scale_environment"
  | "trust_values"
  | "professional_boundaries";

export type CCAIAnswerCode = "A" | "B" | "C";

export interface CCAIQuestion {
  id: string;
  code: string;
  category: CCAICategory;
  question_fr: string;
  question_en: string;
  weight: number;
}

export interface CCAIAnswer {
  questionCode: string;
  category: CCAICategory;
  answerCode: CCAIAnswerCode;
  weight?: number;
}

export interface CCAICategoryScore {
  category: CCAICategory;
  matched: number;
  total: number;
  percent: number;
}

export interface CCAIResult {
  totalQuestions: number;
  matchedAnswers: number;
  rawScore: number;
  percentScore: number;
  alignmentLabel:
    | "strong_alignment"
    | "good_fit"
    | "caution"
    | "misalignment";
  categoryScores: CCAICategoryScore[];
  strengthsFr: string[];
  watchoutsFr: string[];
  reasonsFr: string[];
}

export interface CCAIEngineOutput {
  ccaiScore25: number;
  ccaiPercent: number;
  ccaiLabelFr: string;
  categoryBreakdown: CCAICategoryScore[];
  topStrengthsFr: string[];
  topWatchoutsFr: string[];
  recommendationTextFr: string;
}

// ─── Constants ───

const CATEGORY_LABELS_FR: Record<CCAIResult["alignmentLabel"], string> = {
  strong_alignment: "Alignement très fort",
  good_fit: "Bonne compatibilité",
  caution: "Prudence",
  misalignment: "Désalignement",
};

const CATEGORY_REASON_MAP_FR: Record<string, string> = {
  work_language: "Langue technique alignée",
  documents_language: "Préférence documentaire alignée",
  quick_updates_language: "Communication quotidienne alignée",
  site_safety_language: "Attentes de sécurité alignées",
  misunderstood_technical_terms: "Bonne gestion des incompréhensions techniques",
  group_meeting_language: "Style de réunion compatible",
  client_role: "Niveau d'implication compatible",
  site_visit_frequency: "Présence chantier compatible",
  minor_field_decisions: "Autonomie décisionnelle alignée",
  mid_project_changes: "Gestion des changements alignée",
  material_finish_selection: "Choix des matériaux aligné",
  project_size: "Vision de l'ampleur du projet compatible",
  occupied_home: "Contexte de maison occupée compatible",
  morning_start_time: "Heure de départ alignée",
  daily_cleanup_expectation: "Attentes de propreté alignées",
  noise_tolerance: "Tolérance au bruit compatible",
  priority: "Priorité projet alignée",
  hidden_issue_response: "Réaction aux imprévus compatible",
  conflict_handling: "Style de résolution de conflit aligné",
  reference_checks: "Niveau de vérification compatible",
  payment_schedule: "Préférences de paiement alignées",
  after_hours_contact: "Limites hors heures compatibles",
  relationship_style: "Style relationnel aligné",
  meet_subcontractors: "Attentes sur les sous-traitants alignées",
  completion_definition: "Définition de fin de chantier alignée",
};

// ─── Core Computation ───

export function computeCCAI(
  questions: CCAIQuestion[],
  homeownerAnswers: CCAIAnswer[],
  contractorAnswers: CCAIAnswer[]
): CCAIResult {
  const homeownerMap = new Map(homeownerAnswers.map((a) => [a.questionCode, a]));
  const contractorMap = new Map(contractorAnswers.map((a) => [a.questionCode, a]));

  let matchedAnswers = 0;
  let rawScore = 0;

  const categoryBuckets: Record<CCAICategory, { matched: number; total: number }> = {
    language_communication: { matched: 0, total: 0 },
    involvement_complexity: { matched: 0, total: 0 },
    scale_environment: { matched: 0, total: 0 },
    trust_values: { matched: 0, total: 0 },
    professional_boundaries: { matched: 0, total: 0 },
  };

  const strengthsFr: string[] = [];
  const watchoutsFr: string[] = [];
  const reasonsFr: string[] = [];

  for (const question of questions) {
    const h = homeownerMap.get(question.code);
    const c = contractorMap.get(question.code);

    categoryBuckets[question.category].total += 1;

    if (!h || !c) {
      watchoutsFr.push(`Réponse manquante : ${question.question_fr}`);
      continue;
    }

    if (h.answerCode === c.answerCode) {
      matchedAnswers += 1;
      rawScore += question.weight ?? 1;
      categoryBuckets[question.category].matched += 1;

      const reason = CATEGORY_REASON_MAP_FR[question.code];
      if (reason) reasonsFr.push(reason);
    } else {
      const reason = CATEGORY_REASON_MAP_FR[question.code];
      if (reason) watchoutsFr.push(`Écart : ${reason.toLowerCase()}`);
    }
  }

  const totalQuestions = questions.length;
  const percentScore = totalQuestions > 0 ? (matchedAnswers / totalQuestions) * 100 : 0;

  let alignmentLabel: CCAIResult["alignmentLabel"];
  if (matchedAnswers >= 21) alignmentLabel = "strong_alignment";
  else if (matchedAnswers >= 15) alignmentLabel = "good_fit";
  else if (matchedAnswers >= 10) alignmentLabel = "caution";
  else alignmentLabel = "misalignment";

  const categoryScores: CCAICategoryScore[] = Object.entries(categoryBuckets).map(
    ([category, data]) => ({
      category: category as CCAICategory,
      matched: data.matched,
      total: data.total,
      percent: data.total > 0 ? (data.matched / data.total) * 100 : 0,
    })
  );

  strengthsFr.push(...reasonsFr.slice(0, 5));

  return {
    totalQuestions,
    matchedAnswers,
    rawScore,
    percentScore,
    alignmentLabel,
    categoryScores,
    strengthsFr,
    watchoutsFr: watchoutsFr.slice(0, 5),
    reasonsFr,
  };
}

export function getCCAILabelFr(label: CCAIResult["alignmentLabel"]): string {
  return CATEGORY_LABELS_FR[label];
}

export function buildCCAIEngineOutput(result: CCAIResult): CCAIEngineOutput {
  let recommendationTextFr = "";

  switch (result.alignmentLabel) {
    case "strong_alignment":
      recommendationTextFr =
        "Très forte compatibilité comportementale et opérationnelle entre le client et l'entrepreneur.";
      break;
    case "good_fit":
      recommendationTextFr =
        "Bonne compatibilité globale, avec quelques écarts mineurs à clarifier avant le début des travaux.";
      break;
    case "caution":
      recommendationTextFr =
        "Compatibilité partielle. Certaines différences pourraient créer de la friction pendant le projet.";
      break;
    case "misalignment":
      recommendationTextFr =
        "Compatibilité faible. Risque élevé de malentendus, de frustration ou de conflit pendant le projet.";
      break;
  }

  return {
    ccaiScore25: result.matchedAnswers,
    ccaiPercent: result.percentScore,
    ccaiLabelFr: getCCAILabelFr(result.alignmentLabel),
    categoryBreakdown: result.categoryScores,
    topStrengthsFr: result.strengthsFr.slice(0, 3),
    topWatchoutsFr: result.watchoutsFr.slice(0, 3),
    recommendationTextFr,
  };
}

// ─── URS (UNPRO Recommendation Score) ───

export interface MatchingInputScores {
  projectFit: number;
  propertyFit: number;
  ccaiPercent: number;
  dnaFit: number;
  unproScore: number;
  aippScore: number;
  availabilityDistance: number;
  budgetFit: number;
  weightedReviewFit: number;
  riskModifier: number;
}

export function computeUNPRORecommendationScore(input: MatchingInputScores): number {
  const base =
    input.projectFit * 0.22 +
    input.propertyFit * 0.15 +
    input.ccaiPercent * 0.13 +
    input.dnaFit * 0.10 +
    input.unproScore * 0.15 +
    input.aippScore * 0.10 +
    input.availabilityDistance * 0.05 +
    input.budgetFit * 0.05 +
    input.weightedReviewFit * 0.05;

  const total = base + input.riskModifier;
  return Math.max(0, Math.min(100, total));
}
