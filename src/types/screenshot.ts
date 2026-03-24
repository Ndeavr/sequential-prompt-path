/**
 * UNPRO — Screenshot Intelligence Types
 */

export interface ScreenContext {
  screenKey: string;
  screenName: string;
  routePath: string;
  entityType?: string;
  entityId?: string;
  entitySlug?: string;
  isShareWorthy: boolean;
  sharePriorityWeight: number;
}

export interface ScreenshotEventPayload {
  userId?: string;
  sessionId?: string;
  role?: string;
  platform: "ios" | "android" | "web";
  appVersion?: string;
  screenKey: string;
  screenName: string;
  routePath: string;
  entityType?: string;
  entityId?: string;
  entitySlug?: string;
  sharePromptShown?: boolean;
  sharePromptVariant?: string;
  shareCtaClicked?: boolean;
  shareMethod?: string;
  dismissed?: boolean;
}

export interface ShareActionPayload {
  userId?: string;
  sessionId?: string;
  screenshotEventId?: string;
  screenKey: string;
  routePath: string;
  entityType?: string;
  entityId?: string;
  shareMethod: "native_share" | "copy_link" | "qr";
  shareLinkUrl?: string;
}

export interface ScreenshotAnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  screenKey?: string;
  role?: string;
  platform?: string;
}

export interface ScreenshotAnalyticsSummary {
  totalScreenshots: number;
  totalConverted: number;
  conversionRatePercent: number;
}

export interface TopScreenshotedScreen {
  screenKey: string;
  screenName: string;
  totalScreenshots: number;
  totalConvertedShares: number;
}

export interface ScreenshotConversionMetric {
  day: string;
  totalScreenshots: number;
  uniqueUsers: number;
  totalSharedAfterPrompt: number;
}

export interface UserSharePreference {
  userId: string;
  preferredShareMethod?: string;
  timesPromptSeenThisSession: number;
  timesPromptDismissedTotal: number;
  lastPromptSeenAt?: string;
}

export interface ScreenFrictionScore {
  id: string;
  screenKey: string;
  screenName: string;
  timeWindow: string;
  totalViews: number;
  totalScreenshots: number;
  totalPromptShown: number;
  totalPromptDismissed: number;
  totalShareConverted: number;
  screenshotRatePercent: number;
  promptConversionRatePercent: number;
  dismissRatePercent: number;
  frictionScore: number;
  frictionLevel: "low" | "medium" | "high" | "critical";
  lastCalculatedAt: string;
}

export interface ScreenshotAlert {
  id: string;
  screenKey: string;
  alertType: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  metricSnapshot?: Record<string, any>;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string;
}

export interface ScreenshotRecommendation {
  id: string;
  screenKey: string;
  recommendationType: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  supportingMetrics?: Record<string, any>;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string;
}

export type ScreenshotShareVariant =
  | "default"
  | "contractor_profile"
  | "aipp_result"
  | "booking_confirmation"
  | "alex_match"
  | "plan_comparison";

export interface ShareVariantContent {
  title: string;
  text: string;
  benefits: string[];
  primaryCta: string;
  secondaryCta: string;
}

export const SHARE_VARIANTS: Record<ScreenshotShareVariant, ShareVariantContent> = {
  default: {
    title: "Partager autrement",
    text: "Au lieu d'envoyer une capture, partagez cette page interactive en un clic.",
    benefits: ["Meilleur rendu", "Toujours à jour", "Plus simple à ouvrir"],
    primaryCta: "Partager le lien",
    secondaryCta: "Copier le lien",
  },
  contractor_profile: {
    title: "Partagez le profil complet",
    text: "Envoyez le lien interactif plutôt qu'une image statique.",
    benefits: ["Profil complet", "Avis vérifiés", "Contact direct"],
    primaryCta: "Partager le profil",
    secondaryCta: "Copier le lien",
  },
  aipp_result: {
    title: "Partagez ce résultat interactif",
    text: "Le lien garde les informations claires et à jour.",
    benefits: ["Score en temps réel", "Détails complets", "Partage rapide"],
    primaryCta: "Partager le résultat",
    secondaryCta: "Copier le lien",
  },
  booking_confirmation: {
    title: "Partagez le lien de réservation",
    text: "Plus pratique qu'une capture pour transférer ou réserver.",
    benefits: ["Détails mis à jour", "Confirmation officielle", "Lien direct"],
    primaryCta: "Partager la réservation",
    secondaryCta: "Copier le lien",
  },
  alex_match: {
    title: "Partagez cette recommandation",
    text: "Envoyez la version complète en un clic.",
    benefits: ["Recommandation complète", "Score de compatibilité", "Action rapide"],
    primaryCta: "Partager la recommandation",
    secondaryCta: "Copier le lien",
  },
  plan_comparison: {
    title: "Partagez la comparaison",
    text: "Envoyez tous les détails de la comparaison en un clic.",
    benefits: ["Comparaison complète", "Tarifs actuels", "Lien rapide"],
    primaryCta: "Partager les plans",
    secondaryCta: "Copier le lien",
  },
};

export const SCREENSHOT_FEATURE_FLAGS = {
  screenshotDetectionMobile: "screenshot_detection_mobile",
  smartSharePrompt: "smart_share_prompt",
  frictionScoring: "friction_scoring",
  adminAlerts: "admin_alerts",
  recommendationsEngine: "recommendations_engine",
  webShareFallback: "web_share_fallback",
} as const;
