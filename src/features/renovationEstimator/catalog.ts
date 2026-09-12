/**
 * UNPRO — Catalogue du calculateur de rénovation (fr-CA).
 *
 * Toutes les fourchettes sont des références versionnées, jamais des valeurs
 * inventées à l'écran. Provenance par défaut : « Inféré » (fourchettes de
 * marché résidentiel québécois). Les composantes réellement mesurées
 * (market_price_benchmarks) remplacent la référence et passent en « Déclaré ».
 */

export const ESTIMATOR_CONFIG_VERSION = "reno-bench-2026.09";
export const ESTIMATOR_EFFECTIVE_DATE = "2026-09-01";

export type RenoCategory =
  | "cuisine"
  | "salle_de_bain"
  | "sous_sol"
  | "garage"
  | "aire_de_vie"
  | "renovation_complete";

export type ScopeLevel = "essentiel" | "standard" | "haut_de_gamme";
export type PropertyKind = "maison" | "condo" | "plex" | "autre";
export type BuildingAge = "recent" | "1980_2005" | "avant_1980" | "inconnu";

export interface AddonDef {
  id: string;
  label: string;
  /** Fourchette incrémentale en dollars (avant taxes). */
  min: number;
  max: number;
  /** Composante correspondante dans market_price_benchmarks, si applicable. */
  benchmarkComponent?: string;
}

export interface CategoryDef {
  id: RenoCategory;
  label: string;
  tagline: string;
  sizeLabel: string;
  sizeUnit: string;
  sizeMin: number;
  sizeMax: number;
  sizeDefault: number;
  sizeStep: number;
  /** Taux au pi² (avant taxes) par niveau de finition. */
  rates: Record<ScopeLevel, { min: number; max: number }>;
  addons: AddonDef[];
  /** Demande l'âge du bâtiment seulement si cela change le coût/la confiance. */
  asksAge: boolean;
}

export const SCOPE_LABELS: Record<ScopeLevel, string> = {
  essentiel: "Essentiel",
  standard: "Standard",
  haut_de_gamme: "Haut de gamme",
};

export const PROPERTY_LABELS: Record<PropertyKind, string> = {
  maison: "Maison",
  condo: "Condo",
  plex: "Plex",
  autre: "Autre",
};

export const AGE_LABELS: Record<BuildingAge, string> = {
  recent: "2006 et plus récent",
  "1980_2005": "1980 à 2005",
  avant_1980: "Avant 1980",
  inconnu: "Je ne sais pas",
};

/** Facteur de complexité par type de propriété (accès, copropriété, structure). */
export const PROPERTY_FACTOR: Record<PropertyKind, number> = {
  maison: 1.0,
  condo: 1.08,
  plex: 1.05,
  autre: 1.0,
};

/** Facteur lié à l'âge (mises aux normes probables). */
export const AGE_FACTOR: Record<BuildingAge, number> = {
  recent: 1.0,
  "1980_2005": 1.05,
  avant_1980: 1.12,
  inconnu: 1.04,
};

/** Facteur local — référence indicative, jamais présentée comme vérifiée. */
export const CITY_FACTOR: Record<string, number> = {
  montreal: 1.0,
  laval: 0.99,
  longueuil: 0.98,
  terrebonne: 0.97,
  blainville: 0.97,
  repentigny: 0.96,
  mascouche: 0.96,
  brossard: 0.99,
  "saint-jerome": 0.95,
  gatineau: 0.96,
  quebec: 0.95,
  sherbrooke: 0.93,
  trois_rivieres: 0.92,
};
export const DEFAULT_CITY_FACTOR = 0.97;

export const TAX_GST = 0.05;
export const TAX_QST = 0.09975;

export const CATEGORIES: Record<RenoCategory, CategoryDef> = {
  cuisine: {
    id: "cuisine",
    label: "Cuisine",
    tagline: "Armoires, comptoirs, électroménagers",
    sizeLabel: "Superficie de la cuisine",
    sizeUnit: "pi²",
    sizeMin: 60,
    sizeMax: 600,
    sizeDefault: 150,
    sizeStep: 10,
    asksAge: true,
    rates: {
      essentiel: { min: 110, max: 170 },
      standard: { min: 165, max: 260 },
      haut_de_gamme: { min: 250, max: 420 },
    },
    addons: [
      { id: "armoires_sur_mesure", label: "Armoires sur mesure", min: 8000, max: 20000 },
      { id: "comptoir_quartz", label: "Comptoirs en quartz", min: 3000, max: 8000 },
      { id: "electromenagers", label: "Électroménagers haut de gamme", min: 5000, max: 15000 },
      { id: "ilot", label: "Îlot de cuisine", min: 2500, max: 7000 },
      { id: "dosseret", label: "Dosseret en céramique", min: 800, max: 2500 },
      { id: "plancher", label: "Plancher de bois franc", min: 2000, max: 6000 },
      {
        id: "deplacement_plomberie",
        label: "Déplacement plomberie / électricité",
        min: 1800,
        max: 6500,
        benchmarkComponent: "Plomberie",
      },
    ],
  },
  salle_de_bain: {
    id: "salle_de_bain",
    label: "Salle de bain",
    tagline: "Douche, céramique, vanité",
    sizeLabel: "Superficie de la salle de bain",
    sizeUnit: "pi²",
    sizeMin: 30,
    sizeMax: 250,
    sizeDefault: 60,
    sizeStep: 5,
    asksAge: true,
    rates: {
      essentiel: { min: 150, max: 230 },
      standard: { min: 220, max: 340 },
      haut_de_gamme: { min: 330, max: 520 },
    },
    addons: [
      { id: "douche_ceramique", label: "Douche en céramique sur mesure", min: 3500, max: 9000 },
      { id: "bain_autoportant", label: "Bain autoportant", min: 1500, max: 5000 },
      { id: "vanite", label: "Vanité sur mesure", min: 1200, max: 4500 },
      { id: "plancher_chauffant", label: "Plancher chauffant", min: 1200, max: 3500 },
      { id: "ventilation", label: "Ventilation / échangeur d'air", min: 600, max: 2200 },
      {
        id: "deplacement_plomberie_sdb",
        label: "Déplacement de plomberie",
        min: 1500, max: 5500,
        benchmarkComponent: "Plomberie",
      },
    ],
  },
  sous_sol: {
    id: "sous_sol",
    label: "Sous-sol",
    tagline: "Isolation, cloisons, planchers",
    sizeLabel: "Superficie du sous-sol",
    sizeUnit: "pi²",
    sizeMin: 200,
    sizeMax: 2000,
    sizeDefault: 700,
    sizeStep: 25,
    asksAge: true,
    rates: {
      essentiel: { min: 45, max: 75 },
      standard: { min: 70, max: 115 },
      haut_de_gamme: { min: 110, max: 180 },
    },
    addons: [
      { id: "isolation", label: "Isolation des murs de fondation", min: 2500, max: 9000 },
      { id: "cloisons", label: "Cloisons et pièces fermées", min: 2000, max: 8000 },
      { id: "plafond", label: "Plafond suspendu ou gypse", min: 1500, max: 6000 },
      { id: "plancher_ss", label: "Plancher (vinyle ou flottant)", min: 2000, max: 7000 },
      { id: "salle_bain_ss", label: "Ajout d'une salle de bain", min: 9000, max: 25000 },
      { id: "fenetre_egress", label: "Fenêtre d'évacuation conforme", min: 2500, max: 6500, benchmarkComponent: "Fenêtres" },
    ],
  },
  garage: {
    id: "garage",
    label: "Garage",
    tagline: "Isolation, gypse, revêtement de sol",
    sizeLabel: "Superficie du garage",
    sizeUnit: "pi²",
    sizeMin: 150,
    sizeMax: 1200,
    sizeDefault: 400,
    sizeStep: 25,
    asksAge: false,
    rates: {
      essentiel: { min: 30, max: 55 },
      standard: { min: 50, max: 90 },
      haut_de_gamme: { min: 85, max: 150 },
    },
    addons: [
      { id: "isolation_garage", label: "Isolation", min: 1800, max: 6000 },
      { id: "gypse_garage", label: "Gypse et finition", min: 1500, max: 5500 },
      { id: "electricite_garage", label: "Électricité / borne", min: 1200, max: 5000, benchmarkComponent: "Électricité" },
      { id: "epoxy", label: "Revêtement de plancher époxy", min: 1500, max: 5000 },
      { id: "porte_garage", label: "Porte de garage et rangement", min: 2000, max: 7500 },
    ],
  },
  aire_de_vie: {
    id: "aire_de_vie",
    label: "Salon / aire de vie",
    tagline: "Planchers, éclairage, aménagements",
    sizeLabel: "Superficie de l'aire de vie",
    sizeUnit: "pi²",
    sizeMin: 100,
    sizeMax: 1500,
    sizeDefault: 350,
    sizeStep: 25,
    asksAge: false,
    rates: {
      essentiel: { min: 35, max: 65 },
      standard: { min: 60, max: 105 },
      haut_de_gamme: { min: 100, max: 175 },
    },
    addons: [
      { id: "plancher_av", label: "Nouveaux planchers", min: 2500, max: 9000 },
      { id: "eclairage", label: "Éclairage encastré", min: 1200, max: 4500, benchmarkComponent: "Électricité" },
      { id: "menuiserie", label: "Menuiserie intégrée", min: 2500, max: 12000 },
      { id: "foyer", label: "Foyer", min: 3000, max: 11000 },
      { id: "murs_plafonds", label: "Travaux de murs et plafonds", min: 1500, max: 7000 },
    ],
  },
  renovation_complete: {
    id: "renovation_complete",
    label: "Rénovation complète",
    tagline: "Plusieurs pièces, systèmes inclus",
    sizeLabel: "Superficie habitable à rénover",
    sizeUnit: "pi²",
    sizeMin: 400,
    sizeMax: 5000,
    sizeDefault: 1400,
    sizeStep: 50,
    asksAge: true,
    rates: {
      essentiel: { min: 85, max: 140 },
      standard: { min: 135, max: 220 },
      haut_de_gamme: { min: 210, max: 360 },
    },
    addons: [
      { id: "structure", label: "Modifications structurales", min: 6000, max: 30000 },
      { id: "cuisine_incluse", label: "Cuisine complète incluse", min: 20000, max: 70000 },
      { id: "sdb_incluse", label: "Salle de bain complète incluse", min: 12000, max: 35000 },
      { id: "electricite_complete", label: "Mise à niveau électrique", min: 5000, max: 20000, benchmarkComponent: "Électricité" },
      { id: "plomberie_complete", label: "Mise à niveau plomberie", min: 5000, max: 22000, benchmarkComponent: "Plomberie" },
      { id: "fenetres", label: "Remplacement des fenêtres", min: 8000, max: 30000, benchmarkComponent: "Fenêtres" },
      { id: "planchers_complets", label: "Planchers de toute la surface", min: 6000, max: 25000 },
      { id: "cvac", label: "CVAC / ventilation", min: 6000, max: 24000, benchmarkComponent: "CVAC" },
    ],
  },
};

export const CATEGORY_ORDER: RenoCategory[] = [
  "cuisine",
  "salle_de_bain",
  "sous_sol",
  "garage",
  "aire_de_vie",
  "renovation_complete",
];

export function isRenoCategory(v: string): v is RenoCategory {
  return (CATEGORY_ORDER as string[]).includes(v);
}
