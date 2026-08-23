/**
 * Alex V3 — Picks ONE question per turn following the universal priority order.
 * Skips questions whose answer is already stored in the homeowner's compat DNA.
 */
import type { QualificationGraph } from "./qualificationGraph";
import { getCategoryTree } from "./categoryDecisionTrees";
import { isFieldKnown, type KnownDnaFacts } from "./dnaGate";

export interface NextQuestion {
  field: string;
  question_fr: string;
  why_fr: string;
  ui_hint: "address" | "choice" | "text" | "upload_photo" | "upload_quote" | null;
  options?: { value: string; label_fr: string }[];
}

const URGENCY_OPTIONS = [
  { value: "urgent", label_fr: "Urgent" },
  { value: "30d", label_fr: "Dans les 30 jours" },
  { value: "3m", label_fr: "Dans 3 mois" },
  { value: "year", label_fr: "Cette année" },
  { value: "planning", label_fr: "Je planifie seulement" },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: "house", label_fr: "Maison" },
  { value: "condo", label_fr: "Condo" },
  { value: "duplex", label_fr: "Duplex" },
  { value: "multiplex", label_fr: "Multiplex" },
  { value: "cottage", label_fr: "Chalet" },
];

const BUDGET_OPTIONS = [
  { value: "unknown", label_fr: "Je ne sais pas" },
  { value: "<5k", label_fr: "Moins de 5 000 $" },
  { value: "5-15k", label_fr: "5 000 – 15 000 $" },
  { value: "15-50k", label_fr: "15 000 – 50 000 $" },
  { value: "50k+", label_fr: "50 000 $ et plus" },
];

/**
 * Exigences de préqualification déclarées par les entrepreneurs candidats
 * (table `contractor_prequalification_requirements`). Alex les pose AVANT de proposer
 * un rendez-vous, seulement si elles ne sont pas déjà couvertes par le graphe.
 */
export interface PrequalRequirement {
  criterion: string;
  level: "optional" | "important" | "required";
}

const PREQUAL_QUESTIONS: Record<string, { question_fr: string; why_fr: string; ui_hint: NextQuestion["ui_hint"] }> = {
  photos: {
    question_fr: "Pouvez-vous ajouter une photo du problème ? Le professionnel en a besoin avant de se déplacer.",
    why_fr: "Exigence du professionnel recommandé.",
    ui_hint: "upload_photo",
  },
  foundation_type: {
    question_fr: "Savez-vous de quel type de fondation il s'agit : béton coulé, blocs, pierre ou dalle ?",
    why_fr: "Le professionnel doit connaître le type de fondation avant la visite.",
    ui_hint: "choice",
  },
  water_active: {
    question_fr: "Y a-t-il de l'eau qui entre en ce moment ?",
    why_fr: "Détermine l'urgence réelle de l'intervention.",
    ui_hint: "choice",
  },
  basement_finished: {
    question_fr: "Votre sous-sol est-il fini ?",
    why_fr: "Influence la méthode de travail à l'intérieur.",
    ui_hint: "choice",
  },
  access_description: {
    question_fr: "Comment est l'accès au terrain pour de la machinerie ?",
    why_fr: "L'accès détermine l'équipement nécessaire.",
    ui_hint: "text",
  },
  camera_report: {
    question_fr: "Avez-vous un rapport d'inspection par caméra ?",
    why_fr: "Évite une inspection en double.",
    ui_hint: "choice",
  },
  owner_decision: {
    question_fr: "Êtes-vous la personne qui prend la décision finale pour ces travaux ?",
    why_fr: "Le professionnel réserve ses plages aux décisionnaires.",
    ui_hint: "choice",
  },
  timeline: {
    question_fr: "Dans quel échéancier souhaitez-vous que les travaux soient réalisés ?",
    why_fr: "Pour valider la disponibilité réelle du professionnel.",
    ui_hint: "text",
  },
};

/** Critères déjà couverts par le graphe de qualification universel. */
const PREQUAL_COVERED_BY_GRAPH: Record<string, (g: QualificationGraph) => boolean> = {
  address: (g) => !!g.property.address,
  budget_range: (g) => !!g.budget,
  photos: (g) => !!g.photos?.requested,
  timeline: (g) => !!g.urgency,
};

export function pickNextQuestion(
  g: QualificationGraph,
  dna?: KnownDnaFacts,
  prequal?: PrequalRequirement[],
): NextQuestion | null {
  const known = (field: string) => (dna ? isFieldKnown(dna, field) : false);

  // 1. Problem category (must exist before we can branch)
  if (!g.problem.category && !known("problem.category")) {
    return {
      field: "problem.category",
      question_fr: "Décrivez-moi en quelques mots la situation ou le projet pour votre propriété.",
      why_fr: "Pour identifier la bonne expertise.",
      ui_hint: "text",
    };
  }

  // 2. Property address (must precede everything trade-specific)
  if (!g.property.confirmed || !g.property.address) {
    return {
      field: "property.address",
      question_fr: "Quelle est l'adresse de la propriété concernée ?",
      why_fr: "L'adresse nous donne la ville, le code postal et l'intelligence propriété nécessaire au matching.",
      ui_hint: "address",
    };
  }

  // 3. Problem sub-type (category-specific tree)
  const tree = getCategoryTree(g.problem.category);
  if (tree && !g.problem.sub_type) {
    return {
      field: "problem.sub_type",
      question_fr: tree.sub_type_question_fr,
      why_fr: "Chaque type de projet exige une expertise différente.",
      ui_hint: "choice",
      options: tree.sub_types,
    };
  }

  // 3b. Questions métier propres au corps de métier (une à la fois)
  if (tree?.extra_questions?.length) {
    const ctx = (g.project_context ?? {}) as Record<string, unknown>;
    for (const q of tree.extra_questions) {
      if (q.only_sub_types && g.problem.sub_type && !q.only_sub_types.includes(g.problem.sub_type)) continue;
      if (ctx[q.key] !== undefined && ctx[q.key] !== null && ctx[q.key] !== "") continue;
      if (known(`project_context.${q.key}`)) continue;
      return {
        field: `project_context.${q.key}`,
        question_fr: q.question_fr,
        why_fr: q.why_fr,
        ui_hint: "choice",
        options: q.options,
      };
    }
  }

  // 4. Urgency
  if (!g.urgency && !known("urgency")) {
    return {
      field: "urgency",
      question_fr: "Quand souhaitez-vous réaliser les travaux ?",
      why_fr: "Pour filtrer les professionnels disponibles.",
      ui_hint: "choice",
      options: URGENCY_OPTIONS,
    };
  }

  // 5. Property type
  if (!g.property.type && !known("property.type")) {
    return {
      field: "property.type",
      question_fr: "De quel type de propriété s'agit-il ?",
      why_fr: "Le type de bâtiment influence les exigences et les permis.",
      ui_hint: "choice",
      options: PROPERTY_TYPE_OPTIONS,
    };
  }

  // 6. Quotes (if category invites it and not yet asked)
  if (tree?.invites_quote && g.quotes.received === null) {
    return {
      field: "quotes.received",
      question_fr: "Avez-vous déjà reçu des soumissions pour ce projet ?",
      why_fr: "Nous pouvons les analyser et les comparer gratuitement.",
      ui_hint: "upload_quote",
    };
  }

  // 7. Photos (if category invites it)
  if (tree?.invites_photo && !g.photos.requested && !known("photos.requested")) {
    return {
      field: "photos",
      question_fr: "Souhaitez-vous ajouter des photos ? Ça aide énormément à préciser le diagnostic.",
      why_fr: "Les photos améliorent la précision du matching.",
      ui_hint: "upload_photo",
    };
  }

  // 8. Budget (optional, non-blocking)
  if (!g.budget && !known("budget")) {
    return {
      field: "budget",
      question_fr: "Quel budget envisagez-vous ? (Facultatif)",
      why_fr: "Pour proposer des solutions adaptées à votre enveloppe.",
      ui_hint: "choice",
      options: BUDGET_OPTIONS,
    };
  }

  // 9. Exigences de préqualification des entrepreneurs candidats (obligatoires d'abord)
  const ordered = (prequal ?? [])
    .filter((p) => p.level !== "optional")
    .sort((a, b) => (a.level === "required" ? -1 : 1) - (b.level === "required" ? -1 : 1));
  for (const req of ordered) {
    if (PREQUAL_COVERED_BY_GRAPH[req.criterion]?.(g)) continue;
    if (g.prequal_answers?.[req.criterion]) continue;
    const q = PREQUAL_QUESTIONS[req.criterion];
    if (!q) continue;
    return { field: `prequal.${req.criterion}`, ...q };
  }

  return null;
}

