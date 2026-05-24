/**
 * UNPRO — Project Catalog
 * Taxonomy for the multi-surface estimator: categories, methods, materials,
 * rich condition codes, deterministic recommendations + decision guidance.
 */
import type { WallCondition } from "./engine";

export type ProjectCategory =
  | "interior"
  | "exterior"
  | "deck_wood"
  | "metal_specialty"
  | "commercial"
  | "pool"
  | "paver_sealing"
  | "asphalt"
  | "roof_nano";

export type ApplicationMethod =
  | "rouleau"
  | "pinceau"
  | "spray"
  | "airless"
  | "teinture"
  | "vernis"
  | "epoxy"
  | "antirouille"
  | "scellant_nano"
  | "scellant_acrylique"
  | "scellant_silane"
  | "epandage_asphalte";

export type SurfaceMaterial =
  | "gypse"
  | "bois"
  | "aluminium"
  | "vinyle"
  | "brique"
  | "beton"
  | "metal"
  | "fer_forge"
  | "composite"
  | "stucco"
  | "pave_uni"
  | "asphalte"
  | "bardeau"
  | "membrane_elasto"
  | "fibre_piscine"
  | "beton_piscine";

export type SurfaceConditionCode =
  // generic
  | "excellent"
  | "bon"
  | "ecaille"
  | "rouille"
  | "fissures"
  | "bois_abime"
  | "moisissure"
  | "ancienne_peinture"
  | "graffiti"
  | "decoloration_uv"
  // pavé / asphalte
  | "joints_erodes"
  | "mauvaises_herbes"
  | "affaissement"
  | "taches_huile"
  | "fissures_pave"
  | "decoloration_asphalte"
  // toiture
  | "mousse_lichen"
  | "granules_perdus"
  | "oxydation"
  | "infiltration_legere"
  // piscine
  | "farinage"
  | "taches_calcaire"
  | "coque_usee";

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  interior: "Intérieur",
  exterior: "Extérieur",
  deck_wood: "Patio & bois",
  metal_specialty: "Métal & spécialité",
  commercial: "Commercial",
  pool: "Piscine",
  paver_sealing: "Scellant pavé uni",
  asphalt: "Asphalte",
  roof_nano: "Scellant toiture nano",
};

export const CATEGORY_TAGLINES: Record<ProjectCategory, string> = {
  interior: "Murs, plafonds, escaliers",
  exterior: "Façade, revêtement, garage",
  deck_wood: "Patio, clôture, pergola",
  metal_specialty: "Fer forgé, rampes, époxy",
  commercial: "Bureau, multi-logements",
  pool: "Béton, fibre, spa, margelles",
  paver_sealing: "Allée, patio, joints",
  asphalt: "Entrée, stationnement, scellant",
  roof_nano: "Bardeau, métal, membrane",
};

export const CATEGORY_ITEMS: Record<ProjectCategory, string[]> = {
  interior: ["Murs", "Plafonds", "Portes", "Escaliers", "Cuisine/SDB", "Condo"],
  exterior: ["Façade", "Revêtement", "Brique peinte", "Aluminium", "Bois extérieur", "Garage"],
  deck_wood: ["Patio", "Clôture", "Pergola", "Bois traité", "Cèdre", "Balcon"],
  metal_specialty: ["Fer forgé", "Rampes", "Escaliers métal", "Époxy plancher", "Antirouille"],
  commercial: ["Bureau", "Entrepôt", "Restaurant", "Multi-logements", "Cage d'escalier"],
  pool: ["Piscine béton", "Piscine fibre", "Spa", "Margelles", "Plage de piscine"],
  paver_sealing: ["Allée résidentielle", "Patio en pavé", "Bordures", "Joints polymériques"],
  asphalt: ["Entrée résidentielle", "Stationnement commercial", "Réparation fissures", "Scellant noir", "Lignage"],
  roof_nano: ["Toiture bardeau", "Toiture métal", "Toiture plate", "Membrane élastomère"],
};

/** Categories that estimate by a single zone instead of room math. */
export const SINGLE_ZONE: ProjectCategory[] = ["pool", "paver_sealing", "asphalt", "roof_nano"];

export interface MethodMeta {
  label: string;
  labour_mult: number;
  material_mult: number;
  hint: string;
}

export const METHODS: Record<ApplicationMethod, MethodMeta> = {
  rouleau: { label: "Rouleau", labour_mult: 1.0, material_mult: 1.0, hint: "Méthode polyvalente pour murs et plafonds." },
  pinceau: { label: "Pinceau", labour_mult: 1.25, material_mult: 1.0, hint: "Le fer forgé demande souvent une préparation antirouille spécialisée." },
  spray: { label: "Spray", labour_mult: 0.75, material_mult: 1.2, hint: "Le spray peut réduire le temps de main-d'œuvre sur certains revêtements." },
  airless: { label: "Airless", labour_mult: 0.7, material_mult: 1.25, hint: "Excellente couverture pour grandes surfaces extérieures." },
  teinture: { label: "Teinture", labour_mult: 0.95, material_mult: 0.85, hint: "La teinture met en valeur le grain du bois et demande moins d'entretien que la peinture." },
  vernis: { label: "Vernis", labour_mult: 1.05, material_mult: 1.1, hint: "Finition protectrice durable pour bois noble." },
  epoxy: { label: "Époxy", labour_mult: 1.4, material_mult: 1.6, hint: "Recommandé pour planchers garage et surfaces de piscine très usées." },
  antirouille: { label: "Antirouille", labour_mult: 1.2, material_mult: 1.15, hint: "Indispensable avant peinture sur métal exposé." },
  scellant_nano: { label: "Scellant nano", labour_mult: 0.9, material_mult: 1.5, hint: "Le scellant nano prolonge la durée de vie d'une toiture sans remplacement complet." },
  scellant_acrylique: { label: "Scellant acrylique", labour_mult: 1.0, material_mult: 1.0, hint: "Bon choix pour piscine en béton en bon état." },
  scellant_silane: { label: "Scellant silane", labour_mult: 1.0, material_mult: 1.2, hint: "Sceller un pavé uni protège les joints et empêche les mauvaises herbes." },
  epandage_asphalte: { label: "Épandage asphalte", labour_mult: 0.95, material_mult: 0.9, hint: "Une asphalte refaite dans les 30 derniers jours ne doit pas être scellée tout de suite." },
};

export interface MaterialMeta {
  label: string;
  prep_mult: number;
  primer_mult: number;
}

export const MATERIALS: Record<SurfaceMaterial, MaterialMeta> = {
  gypse: { label: "Gypse", prep_mult: 1.0, primer_mult: 1.0 },
  bois: { label: "Bois", prep_mult: 1.15, primer_mult: 1.15 },
  aluminium: { label: "Aluminium", prep_mult: 1.1, primer_mult: 1.2 },
  vinyle: { label: "Vinyle", prep_mult: 1.0, primer_mult: 1.05 },
  brique: { label: "Brique", prep_mult: 1.25, primer_mult: 1.2 },
  beton: { label: "Béton", prep_mult: 1.2, primer_mult: 1.15 },
  metal: { label: "Métal", prep_mult: 1.3, primer_mult: 1.3 },
  fer_forge: { label: "Fer forgé", prep_mult: 1.5, primer_mult: 1.35 },
  composite: { label: "Composite", prep_mult: 1.0, primer_mult: 1.0 },
  stucco: { label: "Stucco", prep_mult: 1.2, primer_mult: 1.15 },
  pave_uni: { label: "Pavé uni", prep_mult: 1.15, primer_mult: 1.0 },
  asphalte: { label: "Asphalte", prep_mult: 1.05, primer_mult: 1.0 },
  bardeau: { label: "Bardeau d'asphalte", prep_mult: 1.1, primer_mult: 1.0 },
  membrane_elasto: { label: "Membrane élastomère", prep_mult: 1.0, primer_mult: 1.0 },
  fibre_piscine: { label: "Fibre de verre", prep_mult: 1.1, primer_mult: 1.1 },
  beton_piscine: { label: "Béton de piscine", prep_mult: 1.2, primer_mult: 1.15 },
};

export interface ConditionMeta {
  label: string;
  wall: WallCondition;
  prep_mult: number;
  material_mult: number;
}

export const CONDITIONS: Record<SurfaceConditionCode, ConditionMeta> = {
  excellent: { label: "Excellent", wall: "excellent", prep_mult: 1.0, material_mult: 1.0 },
  bon: { label: "Bon", wall: "good", prep_mult: 1.0, material_mult: 1.0 },
  ecaille: { label: "Peinture qui écaille", wall: "fair", prep_mult: 1.3, material_mult: 1.05 },
  rouille: { label: "Rouille", wall: "poor", prep_mult: 1.5, material_mult: 1.1 },
  fissures: { label: "Fissures", wall: "fair", prep_mult: 1.25, material_mult: 1.05 },
  bois_abime: { label: "Bois abîmé", wall: "poor", prep_mult: 1.4, material_mult: 1.1 },
  moisissure: { label: "Moisissure", wall: "fair", prep_mult: 1.35, material_mult: 1.1 },
  ancienne_peinture: { label: "Ancienne peinture", wall: "fair", prep_mult: 1.2, material_mult: 1.0 },
  graffiti: { label: "Graffiti", wall: "fair", prep_mult: 1.3, material_mult: 1.05 },
  decoloration_uv: { label: "Décoloration UV", wall: "good", prep_mult: 1.05, material_mult: 1.0 },
  joints_erodes: { label: "Joints érodés", wall: "fair", prep_mult: 1.3, material_mult: 1.15 },
  mauvaises_herbes: { label: "Mauvaises herbes dans joints", wall: "fair", prep_mult: 1.25, material_mult: 1.05 },
  affaissement: { label: "Affaissement", wall: "poor", prep_mult: 1.6, material_mult: 1.1 },
  taches_huile: { label: "Taches d'huile", wall: "fair", prep_mult: 1.3, material_mult: 1.1 },
  fissures_pave: { label: "Fissures dans pavé", wall: "fair", prep_mult: 1.25, material_mult: 1.05 },
  decoloration_asphalte: { label: "Asphalte décolorée", wall: "good", prep_mult: 1.05, material_mult: 1.0 },
  mousse_lichen: { label: "Mousse / lichen", wall: "fair", prep_mult: 1.3, material_mult: 1.1 },
  granules_perdus: { label: "Granules perdus", wall: "fair", prep_mult: 1.2, material_mult: 1.15 },
  oxydation: { label: "Oxydation métal", wall: "fair", prep_mult: 1.3, material_mult: 1.15 },
  infiltration_legere: { label: "Infiltration légère", wall: "poor", prep_mult: 1.7, material_mult: 1.2 },
  farinage: { label: "Farinage", wall: "poor", prep_mult: 1.5, material_mult: 1.2 },
  taches_calcaire: { label: "Taches de calcaire", wall: "fair", prep_mult: 1.2, material_mult: 1.1 },
  coque_usee: { label: "Coque usée", wall: "poor", prep_mult: 1.6, material_mult: 1.25 },
};

/** Methods that make sense per category (UI filter). */
export const CATEGORY_METHODS: Record<ProjectCategory, ApplicationMethod[]> = {
  interior: ["rouleau", "pinceau", "spray"],
  exterior: ["rouleau", "spray", "airless", "pinceau"],
  deck_wood: ["teinture", "vernis", "spray", "rouleau"],
  metal_specialty: ["pinceau", "antirouille", "epoxy", "spray"],
  commercial: ["airless", "spray", "rouleau", "epoxy"],
  pool: ["scellant_acrylique", "epoxy"],
  paver_sealing: ["scellant_silane", "scellant_acrylique"],
  asphalt: ["epandage_asphalte"],
  roof_nano: ["scellant_nano"],
};

/** Materials that fit each category. */
export const CATEGORY_MATERIALS: Record<ProjectCategory, SurfaceMaterial[]> = {
  interior: ["gypse", "bois", "stucco"],
  exterior: ["bois", "aluminium", "vinyle", "brique", "stucco", "composite"],
  deck_wood: ["bois", "composite"],
  metal_specialty: ["metal", "fer_forge", "aluminium"],
  commercial: ["beton", "gypse", "metal", "stucco"],
  pool: ["beton_piscine", "fibre_piscine"],
  paver_sealing: ["pave_uni"],
  asphalt: ["asphalte"],
  roof_nano: ["bardeau", "metal", "membrane_elasto"],
};

/** Conditions surfaced per category. */
export const CATEGORY_CONDITIONS: Record<ProjectCategory, SurfaceConditionCode[]> = {
  interior: ["excellent", "bon", "ecaille", "fissures", "moisissure", "ancienne_peinture"],
  exterior: ["bon", "ecaille", "decoloration_uv", "fissures", "moisissure"],
  deck_wood: ["bon", "bois_abime", "decoloration_uv", "moisissure"],
  metal_specialty: ["bon", "rouille", "ecaille", "oxydation"],
  commercial: ["bon", "ecaille", "graffiti", "fissures"],
  pool: ["bon", "farinage", "taches_calcaire", "coque_usee"],
  paver_sealing: ["bon", "joints_erodes", "mauvaises_herbes", "taches_huile", "fissures_pave", "affaissement"],
  asphalt: ["bon", "decoloration_asphalte", "fissures_pave", "taches_huile", "affaissement"],
  roof_nano: ["bon", "mousse_lichen", "granules_perdus", "oxydation", "infiltration_legere"],
};

export interface DecisionAdvice {
  title: string;
  recommended: string;
  alternative: string;
  reasoning: string;
}

export interface CategoryDecisionPack {
  lifespanYears: number;
  maintenance: "faible" | "moyen" | "eleve";
  resaleRoiPct: number;
  decision: DecisionAdvice;
}

const PACKS: Record<ProjectCategory, CategoryDecisionPack> = {
  interior: {
    lifespanYears: 7,
    maintenance: "faible",
    resaleRoiPct: 60,
    decision: {
      title: "Peinture vs teinture",
      recommended: "Peinture latex premium",
      alternative: "Glaze ou finition mate designer",
      reasoning: "La peinture latex premium reste le meilleur ratio durée/coût en intérieur résidentiel.",
    },
  },
  exterior: {
    lifespanYears: 10,
    maintenance: "moyen",
    resaleRoiPct: 80,
    decision: {
      title: "Peinture vs teinture",
      recommended: "Peinture 100 % acrylique extérieure",
      alternative: "Teinture opaque pour bois",
      reasoning: "Une bonne préparation extérieure double la durée de vie de la peinture.",
    },
  },
  deck_wood: {
    lifespanYears: 4,
    maintenance: "moyen",
    resaleRoiPct: 50,
    decision: {
      title: "Peinture vs teinture",
      recommended: "Teinture semi-transparente",
      alternative: "Vernis polyuréthane",
      reasoning: "La teinture pénètre le bois et demande moins d'entretien que la peinture qui écaille.",
    },
  },
  metal_specialty: {
    lifespanYears: 8,
    maintenance: "faible",
    resaleRoiPct: 55,
    decision: {
      title: "Antirouille vs époxy",
      recommended: "Apprêt antirouille + finition pinceau",
      alternative: "Époxy industriel",
      reasoning: "Sur fer forgé, l'apprêt antirouille bien appliqué prolonge la durée de vie de 5 à 8 ans.",
    },
  },
  commercial: {
    lifespanYears: 6,
    maintenance: "moyen",
    resaleRoiPct: 45,
    decision: {
      title: "Latex vs époxy",
      recommended: "Latex commercial haute durabilité",
      alternative: "Époxy planchers",
      reasoning: "Le latex commercial offre le meilleur compromis pour murs et plafonds à fort trafic.",
    },
  },
  pool: {
    lifespanYears: 5,
    maintenance: "moyen",
    resaleRoiPct: 35,
    decision: {
      title: "Scellant acrylique vs époxy",
      recommended: "Scellant acrylique",
      alternative: "Époxy 2 composants",
      reasoning: "Une piscine en béton qui farine demande un époxy plutôt qu'un acrylique standard.",
    },
  },
  paver_sealing: {
    lifespanYears: 4,
    maintenance: "faible",
    resaleRoiPct: 65,
    decision: {
      title: "Scellant silane vs acrylique",
      recommended: "Scellant silane pénétrant",
      alternative: "Scellant acrylique brillant",
      reasoning: "Le silane protège sans changer l'apparence et tient mieux aux cycles de gel-dégel.",
    },
  },
  asphalt: {
    lifespanYears: 3,
    maintenance: "moyen",
    resaleRoiPct: 50,
    decision: {
      title: "Scellant noir vs réfection",
      recommended: "Scellant noir 2 couches",
      alternative: "Réfection complète",
      reasoning: "Sceller tous les 2-3 ans triple la durée de vie d'une entrée résidentielle.",
    },
  },
  roof_nano: {
    lifespanYears: 8,
    maintenance: "faible",
    resaleRoiPct: 70,
    decision: {
      title: "Scellant nano vs remplacement",
      recommended: "Scellant nano céramique",
      alternative: "Remplacement complet de toiture",
      reasoning: "Le scellant nano prolonge la durée de vie sans le coût d'un remplacement complet.",
    },
  },
};

export function getDecisionPack(category: ProjectCategory): CategoryDecisionPack {
  return PACKS[category];
}

/** Deterministic recommendation rules. */
export function recommendMethod(
  category: ProjectCategory,
  material: SurfaceMaterial | undefined,
  conditions: SurfaceConditionCode[],
): ApplicationMethod {
  const has = (c: SurfaceConditionCode) => conditions.includes(c);

  if (category === "pool") {
    if (material === "beton_piscine" && has("farinage")) return "epoxy";
    return "scellant_acrylique";
  }
  if (category === "paver_sealing") return "scellant_silane";
  if (category === "asphalt") return "epandage_asphalte";
  if (category === "roof_nano") return "scellant_nano";
  if (category === "metal_specialty") {
    if (material === "fer_forge" || has("rouille") || has("oxydation")) return "antirouille";
    return "epoxy";
  }
  if (category === "deck_wood") return "teinture";
  if (category === "commercial") return "airless";
  if (category === "exterior") return "airless";
  return "rouleau";
}

export function difficultyFor(
  category: ProjectCategory,
  conditions: SurfaceConditionCode[],
): "facile" | "moyenne" | "elevee" | "specialisee" {
  if (["pool", "roof_nano"].includes(category)) return "specialisee";
  const severe = conditions.some((c) =>
    ["rouille", "bois_abime", "affaissement", "infiltration_legere", "coque_usee", "farinage"].includes(c),
  );
  if (severe) return "elevee";
  if (["metal_specialty", "asphalt", "paver_sealing", "exterior"].includes(category)) return "moyenne";
  return "facile";
}

export function alexHintFor(category: ProjectCategory, method: ApplicationMethod): string {
  const pack = getDecisionPack(category);
  return METHODS[method].hint || pack.decision.reasoning;
}
