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

/* ────────────────────────────────────────────────────────────────
 * 2026 repositioning — « Vous prenez soin de votre maison. Prouvez-le. »
 * The Passeport Maison is the documented memory of the property and
 * the proof it has been well maintained. Never a file manager.
 * ────────────────────────────────────────────────────────────────*/

export const PASSPORT_STORY_H1 = "Votre maison a une histoire. Conservez-la.";

export const PASSPORT_STORY_SUB =
  "Gardez au même endroit tout ce qui raconte la vie de votre propriété : inspections, réparations, rénovations, factures, garanties, photos avant/après, entretiens réalisés et améliorations importantes.";

export const PASSPORT_STORY_SUPPORT =
  "UNPRO vous aide ensuite à anticiper la suite avec des entretiens préventifs suggérés selon votre maison, ses composantes et son historique.";

export const PASSPORT_PROOF_HEADLINE = "Vous prenez soin de votre maison. Prouvez-le.";
export const PASSPORT_PROOF_SUB =
  "Construisez au fil des années le dossier de santé de votre propriété.";

export const PASSPORT_HOME_TEASER = {
  title: "Votre maison devrait se souvenir de tout.",
  items: [
    "Inspection", "Toiture", "Isolation", "Fenêtres",
    "Chauffage", "Réparations", "Rénovations", "Garanties",
  ],
  body:
    "UNPRO garde la mémoire de votre maison et vous aide à prévoir ce qui vient ensuite.",
  cta: PASSPORT_PRIMARY_CTA,
} as const;

/** The 3 periods of value. */
export const PASSPORT_PERIODS = [
  {
    key: "today",
    label: "Aujourd'hui",
    title: "Centralisez ce qui existe déjà",
    items: [
      "Inspections",
      "Factures",
      "Garanties",
      "Rénovations",
      "Réparations",
      "Photos",
      "Documents importants",
    ],
  },
  {
    key: "tomorrow",
    label: "Demain",
    title: "Anticipez ce qui s'en vient",
    items: [
      "Entretiens préventifs suggérés",
      "Éléments à surveiller",
      "Garanties arrivant à échéance",
      "Travaux potentiellement à planifier",
      "Composantes vieillissantes",
    ],
    note:
      "Chaque suggestion affiche sa source et son niveau de certitude. UNPRO ne prétend jamais connaître une durée de vie ou un problème sans données suffisantes.",
  },
  {
    key: "proof",
    label: "Le jour où vous devez le prouver",
    title: "Démontrez ce que vous avez fait",
    items: [
      "Vente de la propriété",
      "Refinancement ou demande hypothécaire",
      "Discussion avec un évaluateur",
      "Contestation d'une évaluation municipale",
      "Réclamation ou garantie",
      "Transmission de l'historique au prochain propriétaire",
    ],
    note:
      "Un historique documenté peut vous aider à démontrer les travaux, améliorations et entretiens réalisés sur la propriété.",
  },
] as const;

/** Resale emotional block. */
export const PASSPORT_RESALE = {
  title: "Un jour, votre maison changera peut-être de propriétaire.",
  body:
    "Imaginez pouvoir remettre à l'acheteur 10, 15 ou 20 ans d'entretien, de rénovations, d'inspections et de garanties documentés au même endroit.",
  punch: PASSPORT_PROOF_HEADLINE,
  cta: "Commencer l'histoire de ma maison",
} as const;

/** Provenance vocabulary — used everywhere data is displayed. */
export const PROVENANCE_LABELS = {
  verified: { label: "Vérifié", help: "Preuve documentaire ou source fiable." },
  declared: { label: "Déclaré", help: "Information fournie par le propriétaire." },
  inferred: { label: "Inféré", help: "Déduction du système, à valider." },
  unconfirmed: { label: "À confirmer", help: "Information insuffisante." },
} as const;

export type ProvenanceKind = keyof typeof PROVENANCE_LABELS;

/** Quick add options (mobile persistent button). */
export const PASSPORT_QUICK_ADD = [
  { key: "invoice", label: "Facture", kind: "document", docType: "invoice" },
  { key: "photo", label: "Photo", kind: "document", docType: "photo" },
  { key: "repair", label: "Réparation", kind: "event", eventType: "repair" },
  { key: "renovation", label: "Rénovation", kind: "event", eventType: "renovation" },
  { key: "inspection", label: "Inspection", kind: "document", docType: "inspection" },
  { key: "warranty", label: "Garantie", kind: "document", docType: "warranty" },
  { key: "maintenance", label: "Entretien", kind: "event", eventType: "maintenance" },
  { key: "other", label: "Autre document", kind: "document", docType: "other" },
] as const;

/** Shareable dossier wording. */
export const PASSPORT_REPORT_TITLE = "Dossier de ma propriété";
export const PASSPORT_REPORT_FOOTNOTE = "Généré à partir du Passeport Maison UNPRO";

/**
 * Claims that must NEVER appear anywhere near the Passeport.
 * No market value, tax or financing promises.
 */
export const PASSPORT_FORBIDDEN_CLAIMS = [
  "augmente la valeur de votre maison",
  "réduit vos taxes",
  "garantit votre financement",
  "augmente automatiquement la valeur marchande",
] as const;
