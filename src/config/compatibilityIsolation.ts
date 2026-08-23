/**
 * UNPRO — Profil de compatibilité : Isolation / Entretoit / Enveloppe
 * Même architecture que le pack excavation (aucun système parallèle) :
 * services → dimensions débloquées → questions conditionnelles → préqualification.
 * Aucune valeur n'est présumée : tout provient des réponses de l'entrepreneur.
 */
import type { ProjectQuestion, ServiceDef, PrequalDef } from "./compatibilityExcavation";

export const ISOLATION_TRADE_PACK = "isolation_entretoit" as const;

/** Étape 1 — Services couverts. */
export const ISOLATION_SERVICES: readonly ServiceDef[] = Object.freeze([
  { slug: "isolation_entretoit", label: "Isolation d'entretoit", unlocks: ["attic", "envelope"] },
  { slug: "ajout_isolant_souffle", label: "Ajout d'isolant soufflé", unlocks: ["attic"] },
  { slug: "fibre_verre_soufflee", label: "Fibre de verre soufflée", unlocks: ["attic"] },
  { slug: "retrait_isolant", label: "Retrait d'isolant existant", unlocks: ["attic", "contamination"] },
  { slug: "decontamination_moisissure", label: "Décontamination de moisissure", unlocks: ["contamination"] },
  { slug: "vermiculite", label: "Vermiculite (retrait / gestion)", unlocks: ["contamination"] },
  { slug: "etancheite_air", label: "Étanchéité à l'air / calfeutrage", unlocks: ["envelope"] },
  { slug: "pare_vapeur_scellage", label: "Pare-vapeur et scellage", unlocks: ["envelope", "attic"] },
  { slug: "ventilation_entretoit", label: "Ventilation d'entretoit", unlocks: ["ventilation", "attic"] },
  { slug: "soffites_deflecteurs", label: "Soffites / déflecteurs (déblocage)", unlocks: ["ventilation"] },
  { slug: "sorties_ventilation", label: "Sorties salle de bain / cuisine / sécheuse", unlocks: ["ventilation"] },
  { slug: "event_toit", label: "Évents de toit (installation)", unlocks: ["ventilation"] },
  { slug: "inspection_entretoit", label: "Inspection d'entretoit", unlocks: ["attic"] },
  { slug: "pertes_chaleur", label: "Diagnostic de pertes de chaleur", unlocks: ["envelope"] },
  { slug: "toit_plat", label: "Isolation de toit plat", unlocks: ["roof_special"] },
  { slug: "plafond_cathedrale", label: "Plafond cathédrale", unlocks: ["roof_special"] },
  { slug: "urethane", label: "Uréthane giclé", unlocks: ["roof_special", "envelope"] },
]);

/** Étape 2 — Types de projets, contraintes d'entretoit, contamination, ventilation. */
export const ISOLATION_PROJECT_QUESTIONS: readonly ProjectQuestion[] = Object.freeze([
  // Types de bâtiments
  { dimension: "project_type", key: "residential_single", label: "Maison unifamiliale" },
  { dimension: "project_type", key: "plex_multi", label: "Plex / multilogements" },
  { dimension: "project_type", key: "condo_syndicate", label: "Copropriété (syndicat)" },
  { dimension: "project_type", key: "commercial", label: "Commercial / industriel léger" },
  { dimension: "project_type", key: "new_construction", label: "Construction neuve" },
  { dimension: "project_type", key: "mobile_or_chalet", label: "Chalet / maison mobile" },

  // Entretoit et accès
  { dimension: "attic", key: "hatch_access_only", label: "Accès par trappe seulement", requires: ["attic"] },
  { dimension: "attic", key: "no_attic_access", label: "Aucun accès à l'entretoit (ouverture à créer)", requires: ["attic"] },
  { dimension: "attic", key: "low_clearance", label: "Entretoit très bas (dégagement réduit)", requires: ["attic"] },
  { dimension: "attic", key: "trusses_or_obstructed", label: "Fermes de toit / entretoit encombré", requires: ["attic"] },
  { dimension: "attic", key: "top_up_only", label: "Ajout d'isolant seulement (sans retrait)", requires: ["attic"] },
  { dimension: "attic", key: "removal_before_install", label: "Retrait complet avant nouvelle isolation", requires: ["attic"] },
  { dimension: "attic", key: "occupied_home", label: "Maison occupée pendant les travaux", requires: [] },

  // Superficie (bornes du mandat, sans exiger de chiffre précis)
  { dimension: "size", key: "small_under_500", label: "Petits mandats (moins de 500 pi²)", requires: [] },
  { dimension: "size", key: "standard_500_1500", label: "Mandats standards (500 à 1 500 pi²)", requires: [] },
  { dimension: "size", key: "large_over_3000", label: "Grandes surfaces (plus de 3 000 pi²)", requires: [] },

  // Contamination
  { dimension: "contamination", key: "mold_present", label: "Présence de moisissure", requires: ["contamination", "attic"] },
  { dimension: "contamination", key: "vermiculite_suspected", label: "Vermiculite soupçonnée ou confirmée", requires: ["contamination", "attic"] },
  { dimension: "contamination", key: "asbestos_test_required", label: "Test d'amiante requis avant travaux", requires: ["contamination"] },
  { dimension: "contamination", key: "animal_contamination", label: "Contamination par animaux nuisibles", requires: ["contamination", "attic"] },

  // Ventilation
  { dimension: "ventilation", key: "blocked_soffits", label: "Soffites bloqués à débloquer", requires: ["ventilation"] },
  { dimension: "ventilation", key: "bath_vent_in_attic", label: "Ventilateur de salle de bain qui évacue dans l'entretoit", requires: ["ventilation"] },
  { dimension: "ventilation", key: "dryer_vent", label: "Sortie de sécheuse à corriger", requires: ["ventilation"] },
  { dimension: "ventilation", key: "roof_vent_install", label: "Installation d'évents de toit", requires: ["ventilation"] },

  // Enveloppe et diagnostics
  { dimension: "envelope", key: "air_sealing_full", label: "Étanchéité complète de l'enveloppe", requires: ["envelope"] },
  { dimension: "envelope", key: "vapor_barrier_repair", label: "Réparation de pare-vapeur", requires: ["envelope"] },
  { dimension: "envelope", key: "heat_loss_diagnosis", label: "Diagnostic de pertes de chaleur / infiltration d'air", requires: ["envelope"] },
  { dimension: "envelope", key: "ice_dam_condensation", label: "Barrage de glace / condensation dans l'entretoit", requires: ["envelope", "ventilation"] },

  // Toits particuliers
  { dimension: "roof_special", key: "flat_roof", label: "Toit plat", requires: ["roof_special"] },
  { dimension: "roof_special", key: "cathedral_ceiling", label: "Plafond cathédrale", requires: ["roof_special"] },
  { dimension: "roof_special", key: "spray_urethane", label: "Uréthane giclé sur place", requires: ["roof_special"] },

  // Délai et disponibilité d'inspection
  { dimension: "availability", key: "emergency_24_48", label: "Urgence traitée en 24-48 h", requires: [] },
  { dimension: "availability", key: "weekday_daytime", label: "Inspections en semaine, le jour", requires: [] },
  { dimension: "availability", key: "evenings", label: "Inspections en soirée", requires: [] },
  { dimension: "availability", key: "saturday", label: "Inspections le samedi", requires: [] },
  { dimension: "availability", key: "winter_work", label: "Travaux en hiver", requires: [] },
]);

/** Étape 6 — Ce que l'entrepreneur veut savoir AVANT un rendez-vous. */
export const ISOLATION_PREQUAL: readonly PrequalDef[] = Object.freeze([
  { criterion: "photos", label: "Photos de l'entretoit ou du problème" },
  { criterion: "address", label: "Adresse exacte de la propriété" },
  { criterion: "attic_access", label: "Type d'accès à l'entretoit" },
  { criterion: "current_insulation", label: "Isolation actuelle (type / épaisseur si connue)" },
  { criterion: "approx_surface", label: "Superficie approximative" },
  { criterion: "building_age", label: "Année de construction" },
  { criterion: "contamination_known", label: "Moisissure ou vermiculite soupçonnée" },
  { criterion: "ventilation_issue", label: "Problème de ventilation connu" },
  { criterion: "budget_range", label: "Budget approximatif" },
  { criterion: "owner_decision", label: "Le propriétaire est décisionnaire" },
  { criterion: "timeline", label: "Échéancier souhaité" },
]);
