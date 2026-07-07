/**
 * UNPRO — Passeport Maison Positioning Copy
 *
 * Single source of truth for the Home Intelligence Platform framing.
 * All hero/CTA/meta copy MUST flow through this module so the platform
 * can't drift back into "marketplace / trouver un entrepreneur" framing.
 *
 * Rule: the Passeport Maison is the PRODUCT.
 *       Contractor recommendations are a feature.
 */

export const PASSPORT_HERO_H1 =
  "En avez-vous assez de toujours repartir de zéro ?";

export const PASSPORT_HERO_SUB =
  "Votre Passeport Maison conserve l'historique de votre propriété afin de vous aider à planifier les entretiens futurs, anticiper les dépenses importantes, protéger votre investissement et prendre de meilleures décisions.";

export const PASSPORT_PRIMARY_CTA = "Créer mon Passeport Maison";
export const PASSPORT_PRIMARY_HREF = "/dashboard/properties/new";

export const PASSPORT_SECONDARY_CTA = "Découvrir mon historique immobilier";
export const PASSPORT_SECONDARY_HREF = "/dashboard";

export const PASSPORT_META_TITLE =
  "UNPRO — Passeport Maison : l'intelligence de votre propriété";
export const PASSPORT_META_DESCRIPTION =
  "UNPRO crée le Passeport Maison de votre propriété : historique, entretiens, garanties, factures et professionnels — au même endroit, pour prendre de meilleures décisions.";

/**
 * 8 cards for the "Tout ce qui concerne votre propriété" section.
 */
export const PASSPORT_CONTAINS = [
  { title: "Historique des travaux", desc: "Chaque rénovation, chaque intervention." },
  { title: "Inspections", desc: "Rapports, dates, points à surveiller." },
  { title: "Garanties", desc: "Fin de garantie, conditions, contacts." },
  { title: "Factures", desc: "Preuves, montants, catégories." },
  { title: "Photos avant/après", desc: "Preuve visuelle datée." },
  { title: "Entretiens", desc: "Ce qui a été fait, ce qui s'en vient." },
  { title: "Professionnels utilisés", desc: "Qui, quand, pour quoi." },
  { title: "Documents importants", desc: "Baux, permis, plans, contrats." },
] as const;

/**
 * "Prenez de meilleures décisions" — 5 value bullets.
 */
export const PASSPORT_DECISIONS = [
  "Comprendre ce qui a été fait",
  "Prévoir ce qui s'en vient",
  "Budgéter les dépenses futures",
  "Réduire les imprévus",
  "Choisir les bons professionnels",
] as const;

/**
 * Alex homeowner opening — replaces contractor-first prompt.
 */
export const ALEX_HOMEOWNER_OPENING =
  "Bonjour. Comment puis-je vous aider avec votre maison aujourd'hui ?";

/**
 * 7 Alex homeowner quick actions (Passeport-first).
 */
export const ALEX_HOMEOWNER_QUICK_ACTIONS = [
  "Construire mon Passeport Maison",
  "Planifier un projet",
  "Prévoir mes entretiens futurs",
  "Comprendre l'état de ma maison",
  "Trouver un professionnel recommandé",
  "Comparer des soumissions",
  "Vérifier un entrepreneur",
] as const;

/**
 * Contractor landing repositioning — recommandation, not leads.
 */
export const CONTRACTOR_HERO_H1 =
  "Et si l'IA recommandait votre entreprise ?";
export const CONTRACTOR_HERO_SUB =
  "Soyez identifié comme le bon professionnel au bon moment.";
export const CONTRACTOR_CTA = "Être recommandé par UNPRO";

/**
 * Forbidden PRIMARY CTA phrases — never surface as the main action.
 * Kept here so a future content-guard rule can import + enforce.
 */
export const FORBIDDEN_PRIMARY_CTAS = [
  "Trouver un entrepreneur",
  "Obtenir 3 soumissions",
  "Recevoir des prix",
  "3 soumissions",
] as const;
