/**
 * UNPRO — Data Moat Service
 * Maps every major user action to durable, reusable data assets.
 * Connects to the property-centered model and feeds scoring/prediction/SEO systems.
 */

import { trackEvent, type EventCategory } from "@/services/eventTrackingService";

/**
 * Data asset map: action → what is stored, what it feeds.
 */
export const DATA_ASSET_MAP = {
  property_created: {
    tables: ["properties"],
    feeds: ["home_score", "neighborhood_stats", "seo_city_pages"],
    description: "Propriété créée avec adresse normalisée, slug, coordonnées.",
  },
  address_searched: {
    tables: ["platform_events"],
    feeds: ["seo_demand_signals", "neighborhood_heat_map"],
    description: "Signal de demande géolocalisé. Alimente les pages SEO et le ciblage territorial.",
  },
  property_claimed: {
    tables: ["properties (claimed_by, claimed_at)"],
    feeds: ["home_score", "passport", "certification_reviews"],
    description: "Lien propriétaire-propriété vérifié. Débloque le passeport et la certification.",
  },
  passport_field_completed: {
    tables: ["property_passport_sections", "property_completion_tasks"],
    feeds: ["home_score", "confidence_level", "digital_twin"],
    description: "Donnée structurée de la propriété. Améliore le score et les prédictions.",
  },
  document_uploaded: {
    tables: ["property_documents"],
    feeds: ["home_score (maintenance)", "passport_completion", "certification_readiness"],
    description: "Document probant. Augmente la confiance du score et l'éligibilité à la certification.",
  },
  electrical_panel_photo: {
    tables: ["property_documents", "property_passport_sections"],
    feeds: ["home_score (systems)", "digital_twin (electrical_age)", "safety_insights"],
    description: "Photo du panneau électrique. Permet l'estimation de l'âge du système et la détection de risques.",
  },
  project_request_submitted: {
    tables: ["projects"],
    feeds: ["matching_engine", "appointment_distribution", "neighborhood_trends"],
    description: "Demande de projet structurée. Alimente le matching et les signaux de demande locale.",
  },
  contractor_matched: {
    tables: ["project_matches"],
    feeds: ["contractor_aipp_score", "territory_demand", "conversion_analytics"],
    description: "Résultat de matching. Mesure la pertinence des entrepreneurs et la demande territoriale.",
  },
  contractor_verified: {
    tables: ["contractor_verification_runs", "contractor_credentials"],
    feeds: ["contractor_aipp_score", "trust_summary", "public_profile"],
    description: "Vérification de licence/assurance. Renforce la confiance et le score AIPP.",
  },
  contribution_approved: {
    tables: ["contractor_contributions"],
    feeds: ["property_events", "passport_completion", "home_score"],
    description: "Contribution d'entrepreneur approuvée par le propriétaire. Enrichit l'historique de la propriété.",
  },
  grant_answers_submitted: {
    tables: ["grant_questionnaire_answers"],
    feeds: ["grant_eligibility", "property_characteristics", "seo_city_insights"],
    description: "Réponses au questionnaire de subventions. Enrichit le profil énergétique de la propriété.",
  },
  public_page_visited: {
    tables: ["platform_events"],
    feeds: ["seo_analytics", "neighborhood_interest", "city_demand_signals"],
    description: "Visite d'une page publique. Signal de demande pour le contenu SEO et les entrepreneurs.",
  },
  neighborhood_map_interaction: {
    tables: ["platform_events"],
    feeds: ["territory_heat_map", "contractor_opportunity_alerts"],
    description: "Interaction avec la carte. Alimente les opportunités territoriales pour les entrepreneurs.",
  },
} as const;

export type DataAction = keyof typeof DATA_ASSET_MAP;

/**
 * Record a data moat action with structured metadata.
 * Ensures every action creates a trackable, reusable data asset.
 */
export async function recordDataAction(
  action: DataAction,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const assetInfo = DATA_ASSET_MAP[action];
  
  // Map to event tracking categories
  const categoryMap: Record<string, EventCategory> = {
    property_created: "property",
    address_searched: "search",
    property_claimed: "property",
    passport_field_completed: "passport",
    document_uploaded: "passport",
    electrical_panel_photo: "passport",
    project_request_submitted: "project",
    contractor_matched: "matching",
    contractor_verified: "contractor",
    contribution_approved: "contribution",
    grant_answers_submitted: "grant",
    public_page_visited: "seo",
    neighborhood_map_interaction: "map",
  };

  await trackEvent({
    eventType: action,
    category: categoryMap[action] || "property" as EventCategory,
    metadata: {
      ...metadata,
      data_feeds: assetInfo.feeds,
    },
  });
}
