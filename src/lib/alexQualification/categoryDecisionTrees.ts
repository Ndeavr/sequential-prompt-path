/**
 * Alex V3 — Per-trade decision trees.
 * Each tree returns sub-type options + relevant intelligence cards (quote/photo).
 */

export interface CategoryTree {
  category: string;
  sub_types: { value: string; label_fr: string }[];
  invites_quote: boolean;
  invites_photo: boolean;
  sub_type_question_fr: string;
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
    ],
    invites_quote: true,
    invites_photo: true,
    sub_type_question_fr: "Quelle zone à isoler ?",
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
