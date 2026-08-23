/**
 * Alex V3 — Per-trade decision trees.
 * Each tree returns sub-type options + relevant intelligence cards (quote/photo).
 */

export interface ExtraQuestion {
  /** Clé stockée dans `graph.project_context`. */
  key: string;
  question_fr: string;
  why_fr: string;
  options: { value: string; label_fr: string }[];
  /** Ne pose la question que pour ces sous-types (absent = tous). */
  only_sub_types?: string[];
}

export interface CategoryTree {
  category: string;
  sub_types: { value: string; label_fr: string }[];
  invites_quote: boolean;
  invites_photo: boolean;
  sub_type_question_fr: string;
  /** Questions métier posées une à la fois après le sous-type. */
  extra_questions?: ExtraQuestion[];
}

export const CATEGORY_TREES: Record<string, CategoryTree> = {
  roofing: {
    category: "roofing",
    sub_types: [
      { value: "replacement", label_fr: "Remplacement complet" },
      { value: "leak", label_fr: "Fuite / infiltration" },
      { value: "storm_damage", label_fr: "Dommages tempête" },
      { value: "inspection", label_fr: "Inspection" },
    ],
    invites_quote: true,
    invites_photo: true,
    sub_type_question_fr: "De quel type de travaux de toiture s'agit-il ?",
  },
  foundation: {
    category: "foundation",
    sub_types: [
      { value: "crack", label_fr: "Fissure" },
      { value: "water_infiltration", label_fr: "Infiltration d'eau" },
      { value: "settlement", label_fr: "Affaissement" },
    ],
    invites_quote: true,
    invites_photo: true,
    sub_type_question_fr: "Quel est le problème de fondation observé ?",
  },
  electrical: {
    category: "electrical",
    sub_types: [
      { value: "panel_upgrade", label_fr: "Mise à niveau du panneau" },
      { value: "new_install", label_fr: "Nouvelle installation" },
      { value: "inspection", label_fr: "Inspection" },
      { value: "repair", label_fr: "Réparation" },
    ],
    invites_quote: true,
    invites_photo: false,
    sub_type_question_fr: "Quel type de travail électrique avez-vous besoin ?",
  },
  plumbing: {
    category: "plumbing",
    sub_types: [
      { value: "leak", label_fr: "Fuite" },
      { value: "backup", label_fr: "Refoulement" },
      { value: "renovation", label_fr: "Rénovation" },
      { value: "water_heater", label_fr: "Chauffe-eau" },
    ],
    invites_quote: true,
    invites_photo: false,
    sub_type_question_fr: "Quel est le problème de plomberie ?",
  },
  hvac: {
    category: "hvac",
    sub_types: [
      { value: "heat_pump_install", label_fr: "Installation thermopompe" },
      { value: "furnace", label_fr: "Fournaise" },
      { value: "ac", label_fr: "Climatisation" },
      { value: "maintenance", label_fr: "Entretien" },
    ],
    invites_quote: true,
    invites_photo: false,
    sub_type_question_fr: "Quel type de système CVAC ?",
  },
  insulation: {
    category: "insulation",
    sub_types: [
      { value: "attic", label_fr: "Entretoit" },
      { value: "walls", label_fr: "Murs" },
      { value: "basement", label_fr: "Sous-sol" },
      { value: "flat_roof", label_fr: "Toit plat" },
      { value: "cathedral", label_fr: "Plafond cathédrale" },
      { value: "unknown", label_fr: "Je ne sais pas" },
    ],
    invites_quote: true,
    invites_photo: true,
    sub_type_question_fr: "Quelle zone à isoler ?",
    extra_questions: [
      {
        key: "insulation_goal",
        question_fr: "Qu'est-ce qui vous amène : pertes de chaleur, humidité, moisissure, ou un ajout d'isolant ?",
        why_fr: "Le besoin réel change complètement le type de professionnel requis.",
        options: [
          { value: "heat_loss", label_fr: "Pertes de chaleur / factures" },
          { value: "humidity", label_fr: "Humidité / condensation" },
          { value: "mold", label_fr: "Moisissure" },
          { value: "add_insulation", label_fr: "Ajouter de l'isolant" },
          { value: "renovation", label_fr: "Rénovation en cours" },
          { value: "unknown", label_fr: "Je ne sais pas" },
        ],
      },
      {
        key: "attic_access",
        question_fr: "Y a-t-il une trappe d'accès à l'entretoit ?",
        why_fr: "Sans accès, l'inspection ne peut pas être planifiée le même jour.",
        only_sub_types: ["attic", "cathedral", "unknown"],
        options: [
          { value: "yes", label_fr: "Oui" },
          { value: "no", label_fr: "Non" },
          { value: "unknown", label_fr: "Je ne sais pas" },
        ],
      },
      {
        key: "contamination_suspected",
        question_fr: "Soupçonnez-vous de la vermiculite, de l'amiante ou de la moisissure sur place ?",
        why_fr: "Ces situations exigent un professionnel autorisé et une méthode spécifique.",
        options: [
          { value: "vermiculite", label_fr: "Vermiculite possible" },
          { value: "mold", label_fr: "Moisissure visible" },
          { value: "none", label_fr: "Rien de tout ça" },
          { value: "unknown", label_fr: "Je ne sais pas" },
        ],
      },
      {
        key: "surface_estimate",
        question_fr: "Environ quelle superficie est concernée ?",
        why_fr: "Pour estimer l'ampleur des travaux sans vous demander de mesurer.",
        options: [
          { value: "under_500", label_fr: "Moins de 500 pi²" },
          { value: "500_1200", label_fr: "500 à 1 200 pi²" },
          { value: "1200_plus", label_fr: "Plus de 1 200 pi²" },
          { value: "unknown", label_fr: "Je ne sais pas" },
        ],
      },
      {
        key: "ventilation_symptoms",
        question_fr: "Observez-vous de la glace, de la condensation ou des soffites bloqués ?",
        why_fr: "La ventilation d'entretoit se règle souvent en même temps que l'isolation.",
        options: [
          { value: "ice_dams", label_fr: "Glace / barrières de glace" },
          { value: "condensation", label_fr: "Condensation" },
          { value: "blocked_soffits", label_fr: "Soffites bloqués" },
          { value: "none", label_fr: "Non" },
          { value: "unknown", label_fr: "Je ne sais pas" },
        ],
      },
      {
        key: "inspection_availability",
        question_fr: "Quel moment vous convient pour une inspection ?",
        why_fr: "Pour réserver une plage réellement disponible.",
        options: [
          { value: "weekday_am", label_fr: "Semaine — avant-midi" },
          { value: "weekday_pm", label_fr: "Semaine — après-midi" },
          { value: "evening", label_fr: "En soirée" },
          { value: "weekend", label_fr: "Fin de semaine" },
          { value: "flexible", label_fr: "Je suis flexible" },
        ],
      },
    ],
  },
  mold: {
    category: "mold",
    sub_types: [
      { value: "inspection", label_fr: "Inspection" },
      { value: "remediation", label_fr: "Décontamination" },
    ],
    invites_quote: false,
    invites_photo: true,
    sub_type_question_fr: "S'agit-il d'une inspection ou d'une décontamination ?",
  },
  windows: {
    category: "windows",
    sub_types: [
      { value: "replacement", label_fr: "Remplacement" },
      { value: "repair", label_fr: "Réparation" },
    ],
    invites_quote: true,
    invites_photo: true,
    sub_type_question_fr: "Remplacement ou réparation ?",
  },
  kitchen_reno: {
    category: "kitchen_reno",
    sub_types: [
      { value: "full", label_fr: "Rénovation complète" },
      { value: "partial", label_fr: "Rénovation partielle" },
      { value: "cabinets", label_fr: "Armoires seulement" },
    ],
    invites_quote: true,
    invites_photo: true,
    sub_type_question_fr: "Quelle envergure de rénovation de cuisine ?",
  },
  landscaping: {
    category: "landscaping",
    sub_types: [
      { value: "design", label_fr: "Aménagement" },
      { value: "maintenance", label_fr: "Entretien" },
      { value: "hardscape", label_fr: "Pavé / muret" },
    ],
    invites_quote: true,
    invites_photo: true,
    sub_type_question_fr: "Quel type de travaux paysagers ?",
  },
};

export function getCategoryTree(category: string | null): CategoryTree | null {
  if (!category) return null;
  return CATEGORY_TREES[category.toLowerCase()] ?? null;
}
