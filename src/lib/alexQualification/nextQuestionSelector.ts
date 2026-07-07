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

export function pickNextQuestion(g: QualificationGraph): NextQuestion | null {
  // 1. Problem category (must exist before we can branch)
  if (!g.problem.category) {
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

  // 4. Urgency
  if (!g.urgency) {
    return {
      field: "urgency",
      question_fr: "Quand souhaitez-vous réaliser les travaux ?",
      why_fr: "Pour filtrer les professionnels disponibles.",
      ui_hint: "choice",
      options: URGENCY_OPTIONS,
    };
  }

  // 5. Property type
  if (!g.property.type) {
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
  if (tree?.invites_photo && !g.photos.requested) {
    return {
      field: "photos",
      question_fr: "Souhaitez-vous ajouter des photos ? Ça aide énormément à préciser le diagnostic.",
      why_fr: "Les photos améliorent la précision du matching.",
      ui_hint: "upload_photo",
    };
  }

  // 8. Budget (optional, non-blocking)
  if (!g.budget) {
    return {
      field: "budget",
      question_fr: "Quel budget envisagez-vous ? (Facultatif)",
      why_fr: "Pour proposer des solutions adaptées à votre enveloppe.",
      ui_hint: "choice",
      options: BUDGET_OPTIONS,
    };
  }

  return null;
}
