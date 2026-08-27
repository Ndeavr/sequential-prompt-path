/**
 * UNPRO — ChatGPT / AI assistant integration status (internal source of truth).
 *
 * TRUTH CONTRACT — read before editing any public copy:
 * OpenAI does NOT guarantee visibility, ranking or recommendation of any app
 * or business. UNPRO therefore never claims that paying makes a contractor
 * "referenced by ChatGPT" or "ranked in ChatGPT".
 *
 * What UNPRO can truthfully say:
 *  - your profile becomes structured and understandable by AI assistants;
 *  - you become ELIGIBLE / DISCOVERABLE / RECOMMENDABLE THROUGH UNPRO;
 *  - your profile is PREPARED for AI / ChatGPT discovery.
 *
 * The public "Comment ça fonctionne" block renders step 4 from this status, so
 * the integration is never presented as live while it is not.
 */

export type ChatGptIntegrationStatus =
  | "not_submitted"
  | "in_development"
  | "submitted"
  | "in_review"
  | "approved"
  | "live";

/** Real current state. Update ONLY when the app state really changes. */
export const CHATGPT_INTEGRATION_STATUS: ChatGptIntegrationStatus = "in_development";

export const CHATGPT_INTEGRATION_COPY: Record<
  ChatGptIntegrationStatus,
  { fr: string; en: string; badge_fr: string; badge_en: string }
> = {
  not_submitted: {
    fr: "Une intégration UNPRO pour les assistants IA (dont ChatGPT) est prévue. Elle n'est pas encore active.",
    en: "A UNPRO integration for AI assistants (including ChatGPT) is planned. It is not active yet.",
    badge_fr: "À venir",
    badge_en: "Planned",
  },
  in_development: {
    fr: "Nous développons actuellement l'application UNPRO pour les assistants IA (dont ChatGPT). Objectif : permettre à un utilisateur de passer de sa question à un professionnel compatible sans parcourir un annuaire. L'intégration n'est pas encore active, et aucune visibilité dans ChatGPT n'est garantie.",
    en: "We are currently building the UNPRO app for AI assistants (including ChatGPT). Goal: let a user go from their question to a compatible professional without browsing a directory. The integration is not live yet, and no ChatGPT visibility is guaranteed.",
    badge_fr: "En développement",
    badge_en: "In development",
  },
  submitted: {
    fr: "L'application UNPRO pour les assistants IA a été soumise pour approbation. Elle n'est pas encore active, et aucune visibilité dans ChatGPT n'est garantie.",
    en: "The UNPRO app for AI assistants has been submitted for approval. It is not live yet, and no ChatGPT visibility is guaranteed.",
    badge_fr: "Soumise",
    badge_en: "Submitted",
  },
  in_review: {
    fr: "L'application UNPRO pour les assistants IA est en cours de révision. Elle n'est pas encore active, et aucune visibilité dans ChatGPT n'est garantie.",
    en: "The UNPRO app for AI assistants is under review. It is not live yet, and no ChatGPT visibility is guaranteed.",
    badge_fr: "En révision",
    badge_en: "Under review",
  },
  approved: {
    fr: "L'application UNPRO pour les assistants IA est approuvée et son déploiement est en cours. Aucune position ni recommandation dans ChatGPT n'est garantie.",
    en: "The UNPRO app for AI assistants is approved and rolling out. No ChatGPT placement or recommendation is guaranteed.",
    badge_fr: "Approuvée",
    badge_en: "Approved",
  },
  live: {
    fr: "L'application UNPRO est disponible dans les assistants IA compatibles. Les utilisateurs peuvent passer de leur question à un professionnel compatible via UNPRO. Aucune position ni recommandation n'est garantie par OpenAI.",
    en: "The UNPRO app is available in compatible AI assistants. Users can go from their question to a compatible professional through UNPRO. No placement or recommendation is guaranteed by OpenAI.",
    badge_fr: "Actif",
    badge_en: "Live",
  },
};

export function chatgptIntegrationCopy(lang: "fr" | "en" = "fr") {
  const c = CHATGPT_INTEGRATION_COPY[CHATGPT_INTEGRATION_STATUS];
  return {
    text: lang === "en" ? c.en : c.fr,
    badge: lang === "en" ? c.badge_en : c.badge_fr,
    isLive: CHATGPT_INTEGRATION_STATUS === "live",
  };
}
