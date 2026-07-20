/**
 * UNPRO — Admin Tools Registry
 * Single source of truth for every existing admin repair tool.
 */
export type ToolRisk = "safe" | "review" | "danger";
export type ToolCategory =
  | "revenue"
  | "acquisition"
  | "data_quality"
  | "delivery"
  | "publishing"
  | "demand"
  | "trust";

export interface AdminTool {
  id: string;
  label: string;
  description: string;
  route: string;
  category: ToolCategory;
  risk_level: ToolRisk;
  automation_available: boolean;
  requires_approval: boolean;
  related_tables: string[];
  primary_metric: string;
  recommended_action: string;
}

export const ADMIN_TOOLS: AdminTool[] = [
  {
    id: "coupons",
    label: "Codes promo",
    description: "Créer et gérer les coupons (mois gratuit, 1 an gratuit, rabais, offres fondateur).",
    route: "/admin/coupons",
    category: "revenue",
    risk_level: "safe",
    automation_available: false,
    requires_approval: false,
    related_tables: ["coupons", "coupon_redemptions"],
    primary_metric: "coupons actifs",
    recommended_action: "Créer un modèle rapide (1 mois gratuit, 1 an gratuit) et le partager.",
  },
  {

    id: "normalization",
    label: "Normalisation des leads",
    description: "Dry-run / apply nettoyage universel (email, téléphone, site, entreprise).",
    route: "/admin/normalization",
    category: "data_quality",
    risk_level: "safe",
    automation_available: true,
    requires_approval: false,
    related_tables: ["contractor_leads"],
    primary_metric: "leads normalisés",
    recommended_action: "Analyser puis appliquer",
  },
  {
    id: "recovery-sprint",
    label: "Recovery Sprint",
    description: "Re-enrichissement + promotion de leads vers ready_for_contact.",
    route: "/admin/recovery-sprint",
    category: "acquisition",
    risk_level: "review",
    automation_available: true,
    requires_approval: true,
    related_tables: ["contractor_leads", "contractor_outreach_logs"],
    primary_metric: "leads récupérés",
    recommended_action: "Ouvrir cockpit",
  },
  {
    id: "dispatch-bottleneck",
    label: "Dispatch Bottleneck",
    description: "Audit + réparation de la pipeline d'envoi SMS/email.",
    route: "/admin/dispatch-bottleneck",
    category: "delivery",
    risk_level: "review",
    automation_available: true,
    requires_approval: true,
    related_tables: ["outreach_repair_actions"],
    primary_metric: "envois débloqués",
    recommended_action: "Auditer choke-points",
  },
  {
    id: "revenue-gate",
    label: "Revenue Gate Audit",
    description: "Vérifie l'activation post-Stripe (webhook, profile, matching).",
    route: "/admin/revenue-gate-audit",
    category: "revenue",
    risk_level: "review",
    automation_available: false,
    requires_approval: true,
    related_tables: ["contractors", "stripe_webhook_events"],
    primary_metric: "activations validées",
    recommended_action: "Ouvrir audit",
  },
  {
    id: "revenue-path",
    label: "Revenue Path Audit",
    description: "Funnel prospect → paiement avec conversion à chaque étape.",
    route: "/admin/revenue-path-audit",
    category: "revenue",
    risk_level: "safe",
    automation_available: false,
    requires_approval: false,
    related_tables: ["contractor_leads", "contractors"],
    primary_metric: "% conversion étape",
    recommended_action: "Ouvrir funnel",
  },
  {
    id: "revenue-intelligence",
    label: "Acquisition Funnel",
    description: "Vue live du funnel d'acquisition et santé événementielle.",
    route: "/admin/revenue-intelligence",
    category: "acquisition",
    risk_level: "safe",
    automation_available: false,
    requires_approval: false,
    related_tables: ["acquisition_events"],
    primary_metric: "prospects → payants",
    recommended_action: "Voir dashboard",
  },
  {
    id: "dispatch-center",
    label: "Dispatch Center",
    description: "Cockpit temps réel des jobs de dispatch et SLA.",
    route: "/admin/dispatch-center",
    category: "delivery",
    risk_level: "review",
    automation_available: false,
    requires_approval: false,
    related_tables: ["bookings"],
    primary_metric: "SLA respectée",
    recommended_action: "Ouvrir cockpit",
  },
  {
    id: "contractors",
    label: "Entrepreneurs",
    description: "Gestion des profils entrepreneurs et statuts.",
    route: "/admin/contractors",
    category: "publishing",
    risk_level: "review",
    automation_available: false,
    requires_approval: true,
    related_tables: ["contractors"],
    primary_metric: "profils actifs",
    recommended_action: "Voir liste",
  },
  {
    id: "demand-grid",
    label: "Demand Grid",
    description: "Priorisation ville × service selon la demande vs l'offre.",
    route: "/admin/demand-grid",
    category: "demand",
    risk_level: "safe",
    automation_available: true,
    requires_approval: false,
    related_tables: ["demand_signals", "market_demand"],
    primary_metric: "gap score",
    recommended_action: "Recomputer cibles",
  },
  {
    id: "site_health",
    label: "Site Health (diagnostics visuels)",
    description: "Images cassées, remounts répétés, sondes de connectivité, erreurs console.",
    route: "/admin/site-health",
    category: "data_quality",
    risk_level: "safe",
    automation_available: false,
    requires_approval: false,
    related_tables: [],
    primary_metric: "événements visuels",
    recommended_action: "Ouvrir /admin/site-health",
  },
  {
    id: "brand_pronunciation",
    label: "Prononciation de marque UNPRO",
    description: "Verrou phonétique FR/EN utilisé par toutes les voix IA, TTS, vidéos et exports. UNPRO ne doit jamais être épelé.",
    route: "/admin/brand-pronunciation",
    category: "trust",
    risk_level: "safe",
    automation_available: false,
    requires_approval: false,
    related_tables: ["alex_brand_phonetic_lock", "alex_pronunciation_rules", "brand_pronunciations"],
    primary_metric: "prononciations verrouillées",
    recommended_action: "Ouvrir /admin/brand-pronunciation",
  },
];

export const TOOLS_BY_CATEGORY = ADMIN_TOOLS.reduce<Record<string, AdminTool[]>>((acc, t) => {
  (acc[t.category] ??= []).push(t);
  return acc;
}, {});
