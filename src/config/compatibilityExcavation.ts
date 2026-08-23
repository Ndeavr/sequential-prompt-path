/**
 * UNPRO — Profil de compatibilité : Excavation / Fondations / Drainage
 * Source unique de vérité du questionnaire conditionnel (UI + résumé + règles).
 * Aucune valeur affichée n'est inventée : tout provient des réponses de l'entrepreneur.
 */

export type Stance = "priority" | "accepted" | "not_wanted";
export type TriAnswer = "yes" | "no" | "depends";
export type TerritoryTier = "priority" | "normal" | "large_only" | "blocked";
export type PrequalLevel = "optional" | "important" | "required";

export const TRADE_PACK = "excavation_fondation" as const;

export interface ServiceDef {
  slug: string;
  label: string;
  /** Dimensions déclenchées seulement si le service est priority/accepted. */
  unlocks?: string[];
}

/** Étape 1 — Services couverts. */
export const COMPAT_SERVICES: readonly ServiceDef[] = Object.freeze([
  { slug: "excavation", label: "Excavation", unlocks: ["access"] },
  { slug: "fondations", label: "Fondations (réparation / reconstruction)", unlocks: ["foundation", "access"] },
  { slug: "reparation_fissures", label: "Réparation de fissures", unlocks: ["foundation", "crack"] },
  { slug: "injection_fissures", label: "Injection de fissures", unlocks: ["crack"] },
  { slug: "fissures_structurales", label: "Fissures structurales", unlocks: ["crack", "foundation"] },
  { slug: "drain_francais", label: "Drain français", unlocks: ["drainage", "access"] },
  { slug: "remplacement_drain_francais", label: "Remplacement de drain français", unlocks: ["drainage", "access"] },
  { slug: "inspection_drain", label: "Inspection de drain", unlocks: ["drainage"] },
  { slug: "impermeabilisation", label: "Imperméabilisation extérieure", unlocks: ["foundation", "access"] },
  { slug: "membranes", label: "Membranes d'étanchéité", unlocks: ["foundation", "access"] },
  { slug: "impermeabilisation_interieure", label: "Imperméabilisation intérieure", unlocks: ["water", "foundation"] },
  { slug: "infiltration_eau", label: "Infiltration d'eau", unlocks: ["water"] },
  { slug: "puisard_pompe", label: "Puisard / pompe submersible", unlocks: ["drainage"] },
  { slug: "drainage", label: "Drainage du terrain / gestion de l'eau", unlocks: ["drainage"] },
  { slug: "nivellement", label: "Nivellement / pente de terrain", unlocks: [] },
]);


export const STANCE_LABEL: Record<Stance, string> = {
  priority: "Prioritaire",
  accepted: "Accepté",
  not_wanted: "Non recherché",
};

export interface ProjectQuestion {
  dimension: string;
  key: string;
  label: string;
  help?: string;
  /** Affichée seulement si l'une de ces dimensions est débloquée (vide = toujours). */
  requires?: string[];
}

/** Étape 2 — Types de projets, fondations, accès, contraintes. */
export const COMPAT_PROJECT_QUESTIONS: readonly ProjectQuestion[] = Object.freeze([
  // Types de projets
  { dimension: "project_type", key: "residential_single", label: "Maison unifamiliale" },
  { dimension: "project_type", key: "plex_multi", label: "Plex / multilogements" },
  { dimension: "project_type", key: "condo_syndicate", label: "Copropriété (syndicat)" },
  { dimension: "project_type", key: "commercial", label: "Commercial / industriel léger" },
  { dimension: "project_type", key: "new_construction", label: "Construction neuve" },

  // Fondations
  { dimension: "foundation", key: "poured_concrete", label: "Fondation en béton coulé", requires: ["foundation"] },
  { dimension: "foundation", key: "concrete_block", label: "Fondation en blocs de béton", requires: ["foundation"] },
  { dimension: "foundation", key: "stone_rubble", label: "Fondation en pierre (maison ancienne)", requires: ["foundation"] },
  { dimension: "foundation", key: "crawlspace", label: "Vide sanitaire", requires: ["foundation"] },
  { dimension: "foundation", key: "slab_on_grade", label: "Dalle sur sol", requires: ["foundation"] },

  // Fissures
  { dimension: "crack", key: "structural_crack", label: "Fissures structurales", requires: ["crack"] },
  { dimension: "crack", key: "injection_epoxy", label: "Injection époxy / polyuréthane", requires: ["crack"] },
  { dimension: "crack", key: "carbon_stitching", label: "Renforcement fibre de carbone", requires: ["crack"] },

  // Eau
  { dimension: "water", key: "active_infiltration", label: "Infiltration active en cours", requires: ["water"] },
  { dimension: "water", key: "finished_basement", label: "Sous-sol fini (travaux à l'intérieur)", requires: ["water"] },
  { dimension: "water", key: "mold_present", label: "Présence de moisissure", requires: ["water"] },

  // Drainage
  { dimension: "drainage", key: "full_perimeter", label: "Drain sur périmètre complet", requires: ["drainage"] },
  { dimension: "drainage", key: "interior_drain", label: "Drain intérieur", requires: ["drainage"] },
  { dimension: "drainage", key: "camera_inspection", label: "Inspection par caméra", requires: ["drainage"] },

  // Accès et contraintes
  { dimension: "access", key: "narrow_access", label: "Accès étroit (moins de 3 m)", requires: ["access"] },
  { dimension: "access", key: "no_machinery_access", label: "Aucun accès pour machinerie", requires: ["access"] },
  { dimension: "access", key: "urban_dense", label: "Milieu urbain dense (Plateau, Villeray…)", requires: ["access"] },
  { dimension: "access", key: "shared_wall", label: "Mur mitoyen / voisin collé", requires: ["access"] },
  { dimension: "access", key: "pool_or_landscaping", label: "Piscine ou aménagement paysager à protéger", requires: ["access"] },
  { dimension: "access", key: "winter_work", label: "Travaux en hiver", requires: [] },
]);

export const TRI_LABEL: Record<TriAnswer, string> = {
  yes: "Oui",
  no: "Non",
  depends: "Ça dépend",
};

export const VOLUME_OPTIONS = Object.freeze([
  { value: "volume", label: "Plus de projets, plus petits" },
  { value: "value", label: "Moins de projets, plus gros" },
  { value: "balanced", label: "Un équilibre des deux" },
]);

export const TERRITORY_TIER_LABEL: Record<TerritoryTier, string> = {
  priority: "Prioritaire",
  normal: "Normal",
  large_only: "Gros projets seulement",
  blocked: "Ne pas envoyer",
};

export interface PrequalDef {
  criterion: string;
  label: string;
}

/** Étape 6 — Ce que l'entrepreneur veut savoir AVANT un rendez-vous. */
export const COMPAT_PREQUAL: readonly PrequalDef[] = Object.freeze([
  { criterion: "photos", label: "Photos du problème" },
  { criterion: "address", label: "Adresse exacte de la propriété" },
  { criterion: "foundation_type", label: "Type de fondation" },
  { criterion: "budget_range", label: "Budget approximatif" },
  { criterion: "water_active", label: "Présence d'eau active" },
  { criterion: "basement_finished", label: "Sous-sol fini ou non" },
  { criterion: "access_description", label: "Description de l'accès au terrain" },
  { criterion: "camera_report", label: "Rapport d'inspection caméra" },
  { criterion: "owner_decision", label: "Le propriétaire est décisionnaire" },
  { criterion: "timeline", label: "Échéancier souhaité" },
]);

export const PREQUAL_LEVEL_LABEL: Record<PrequalLevel, string> = {
  optional: "Optionnel",
  important: "Important",
  required: "Obligatoire",
};

export const COMPAT_STEPS = Object.freeze([
  { id: 1, title: "Vos services", subtitle: "Ce que vous faites, et ce que vous ne voulez plus faire" },
  { id: 2, title: "Vos projets", subtitle: "Les situations que vous acceptez sur le terrain" },
  { id: 3, title: "Votre argent", subtitle: "Ce qui vaut votre déplacement" },
  { id: 4, title: "Votre territoire", subtitle: "Où vous voulez vraiment travailler" },
  { id: 5, title: "Votre capacité", subtitle: "Votre rythme réel, pas votre rythme idéal" },
  { id: 6, title: "Avant le rendez-vous", subtitle: "Ce que vous devez savoir pour dire oui" },
]);

export const TOTAL_COMPAT_STEPS = COMPAT_STEPS.length;

/** Dimensions débloquées par les services retenus (priority ou accepted). */
export function unlockedDimensions(prefs: Record<string, Stance>): Set<string> {
  const set = new Set<string>();
  for (const svc of COMPAT_SERVICES) {
    const stance = prefs[svc.slug];
    if (stance === "priority" || stance === "accepted") {
      (svc.unlocks ?? []).forEach((d) => set.add(d));
    }
  }
  return set;
}

export function visibleProjectQuestions(prefs: Record<string, Stance>): ProjectQuestion[] {
  const unlocked = unlockedDimensions(prefs);
  return COMPAT_PROJECT_QUESTIONS.filter(
    (q) => !q.requires || q.requires.length === 0 || q.requires.some((d) => unlocked.has(d)),
  );
}

export function citySlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatMoney(cents?: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
