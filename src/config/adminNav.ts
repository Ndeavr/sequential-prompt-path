/**
 * UNPRO — Admin Navigation Config (v3, operator-first)
 *
 * The founder/operator sees FIVE primary destinations. Everything that used to
 * be a top-level menu entry now lives as a TAB inside one of those five, as the
 * secondary "Affiliés" destination, or inside the collapsed
 * "Operations / Avancé" section.
 *
 * Rules:
 *  - Never add a link here without a matching Route in src/app/router.tsx.
 *  - No route is ever removed — deep links stay valid. This file only changes
 *    where a destination is *surfaced*, never whether it exists.
 *  - Primary sections carry the operational work. Advanced carries diagnostics
 *    and internal system architecture the founder rarely needs.
 *  - Audit: `docs/admin-links-audit.md`.
 */
import {
  LayoutDashboard, DollarSign, CalendarDays, Briefcase, Users,
  SearchCheck, ShieldCheck, Shield, TrendingUp, Mail, Smartphone,
  Activity, Sparkles, Brain, Cpu, Bell, Heart, ScrollText, Settings,
  Ban, TestTube, Rocket, BarChart3, Wand2, Bot, FileText, Star,
  Tag, MapPin, Grid3X3, Network, Zap, Camera, ImageIcon, Send,
  Inbox, Server, Target, Palette, FolderOpen, LayoutList, AlertTriangle,
  Upload, HandCoins, UserCheck, Handshake, Radio, Gauge, Clock, Crown,
  UserPlus, PhoneCall, Compass, CreditCard, Siren, Wrench, Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavLeaf { to: string; label: string; icon: LucideIcon }
export interface NavGroup { key: string; label: string; icon: LucideIcon; items: NavLeaf[]; defaultHidden?: boolean }

/** A primary operational destination shown in the sidebar and the bottom nav. */
export interface AdminSection {
  key: string;
  label: string;
  /** Short label used by the mobile bottom nav (must stay ≤ 11 chars). */
  shortLabel: string;
  icon: LucideIcon;
  /** Landing route for the section. */
  to: string;
  /** Extra path prefixes that belong to this section for active-state matching. */
  match?: string[];
  /** Sub-destinations rendered as a horizontally scrollable tab bar. */
  tabs: NavLeaf[];
}

/* ------------------------------------------------------------------ */
/* 1..5 — Primary operational destinations                             */
/* ------------------------------------------------------------------ */

export const adminSections: AdminSection[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    shortLabel: "Dashboard",
    icon: LayoutDashboard,
    to: "/admin",
    match: ["/admin/mission-control", "/admin/alerts", "/admin/operations", "/admin/ai-revenue-proof", "/admin/command-center"],
    tabs: [
      { to: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
      { to: "/admin/mission-control", label: "Mission Control", icon: Compass },
      { to: "/admin/command-center", label: "Command Center", icon: Radio },
      { to: "/admin/ai-revenue-proof", label: "Preuve revenu IA", icon: HandCoins },
      { to: "/admin/alerts", label: "Alertes", icon: Bell },
      { to: "/admin/operations", label: "Santé opérations", icon: Heart },
    ],
  },
  {
    key: "acquisition",
    label: "Acquisition",
    shortLabel: "Acquisition",
    icon: TrendingUp,
    to: "/admin/acquisition",
    match: [
      "/admin/launch-control", "/admin/launch-war-room", "/admin/first-dollar",
      "/admin/users", "/admin/verification", "/admin/acquisition-pipeline",
      "/admin/import-contractors", "/admin/outbound", "/admin/sniper",
      "/admin/recruitment", "/admin/scout", "/admin/prospects", "/admin/prospection",
      "/admin/affiliates", "/admin/partenaires", "/admin/partner-applications",
      "/admin/founder-pipeline",
    ],
    tabs: [
      { to: "/admin/acquisition", label: "Vue d'ensemble", icon: TrendingUp },
      { to: "/admin/launch-control", label: "Launch Control", icon: Rocket },
      { to: "/admin/launch-war-room", label: "War Room", icon: Siren },
      { to: "/admin/first-dollar", label: "First Dollar", icon: HandCoins },
      { to: "/admin/users", label: "Prospects", icon: Users },
      { to: "/admin/verification", label: "Qualification", icon: SearchCheck },
      { to: "/admin/acquisition-pipeline", label: "Santé acquisition", icon: Activity },
      { to: "/admin/import-contractors", label: "Import", icon: Upload },
      { to: "/admin/recruitment", label: "Recrutement", icon: UserPlus },
      { to: "/admin/outbound", label: "Campagnes", icon: Send },
      { to: "/admin/outbound/sms-fallback", label: "SMS", icon: Smartphone },
      { to: "/admin/outbound/sequences", label: "Courriels", icon: Mail },
      { to: "/admin/sniper", label: "Sniper", icon: Target },
      { to: "/admin/scout", label: "Scout", icon: Eye },
      { to: "/admin/affiliates", label: "Affiliés", icon: Handshake },
      { to: "/admin/founder-pipeline", label: "Fondateurs", icon: Crown },
    ],
  },
  {
    key: "contractors",
    label: "Entrepreneurs",
    shortLabel: "Pros",
    icon: Briefcase,
    to: "/admin/contractors",
    match: [
      "/admin/verified-contractors", "/admin/validation", "/admin/activation",
      "/admin/aipp-profiles", "/admin/contacted-contractors", "/admin/contractors-contacted",
      "/admin/contractor", "/admin/onboarding-orchestrator", "/admin/compliance",
    ],
    tabs: [
      { to: "/admin/contractors", label: "Tous", icon: Briefcase },
      { to: "/admin/verified-contractors", label: "Membres actifs", icon: Shield },
      { to: "/admin/compliance", label: "Conformité", icon: ShieldCheck },
      { to: "/admin/validation", label: "Activation", icon: ShieldCheck },
      { to: "/admin/recruitment/onboarding", label: "Onboarding", icon: UserCheck },
      { to: "/admin/onboarding-orchestrator", label: "Orchestrateur", icon: Bot },
      { to: "/admin/aipp-profiles", label: "Profils AIPP", icon: FileText },
      { to: "/admin/contacted-contractors", label: "Contactés", icon: PhoneCall },
      { to: "/admin/contractors/create-manual", label: "Créer", icon: UserPlus },
    ],

  },
  {
    key: "appointments",
    label: "Rendez-vous",
    shortLabel: "RDV",
    icon: CalendarDays,
    to: "/admin/appointments",
    match: [
      "/admin/leads", "/admin/dispatch-center", "/admin/dispatch-bottleneck",
      "/admin/waiting-homeowners", "/admin/plan-appointments", "/admin/no-match-monitoring",
      "/admin/calendar-conversion",
    ],
    tabs: [
      { to: "/admin/appointments", label: "Rendez-vous", icon: CalendarDays },
      { to: "/admin/leads", label: "Demandes", icon: Inbox },
      { to: "/admin/dispatch-center", label: "Dispatch", icon: Radio },
      { to: "/admin/waiting-homeowners", label: "Propriétaires en attente", icon: Clock },
      { to: "/admin/no-match-monitoring", label: "Sans match", icon: AlertTriangle },
      { to: "/admin/dispatch-bottleneck", label: "Blocages", icon: Wrench },
      { to: "/admin/plan-appointments", label: "Quotas de plan", icon: Grid3X3 },
      { to: "/admin/calendar-conversion", label: "Conversion agenda", icon: BarChart3 },
    ],
  },
  {
    key: "revenue",
    label: "Revenus",
    shortLabel: "Revenus",
    icon: DollarSign,
    to: "/admin/pricing",
    match: [
      "/admin/revenue-intelligence", "/admin/unpro-stripe-health", "/admin/stripe-verification",
      "/admin/conversion-lab", "/admin/conversion-truth", "/admin/plans-matrix",
      "/admin/coupons", "/admin/plan-distribution", "/admin/revenue-reality",
      "/admin/pricing-intelligence",
    ],
    tabs: [
      { to: "/admin/pricing", label: "Tarification", icon: DollarSign },
      { to: "/admin/revenue-intelligence", label: "Intelligence revenus", icon: BarChart3 },
      { to: "/admin/revenue-reality", label: "Revenu réel", icon: Gauge },
      { to: "/admin/unpro-stripe-health", label: "Santé Stripe", icon: CreditCard },
      { to: "/admin/stripe-verification", label: "Vérification Stripe", icon: ShieldCheck },
      { to: "/admin/recruitment/payments", label: "Paiements", icon: HandCoins },
      { to: "/admin/conversion-lab", label: "Conversion Lab", icon: TestTube },
      { to: "/admin/conversion-truth", label: "Vérité conversion", icon: SearchCheck },
      { to: "/admin/plans-matrix", label: "Matrice des plans", icon: Grid3X3 },
      { to: "/admin/plan-distribution", label: "Répartition des plans", icon: LayoutList },
      { to: "/admin/pricing-intelligence", label: "Pricing Intelligence", icon: Wand2 },
      { to: "/admin/coupons", label: "Coupons", icon: Tag },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Secondary — Affiliates (clearly separated, always one tap away)      */
/* ------------------------------------------------------------------ */

export const adminSecondaryGroup: NavGroup = {
  key: "affiliates",
  label: "Affiliés & partenaires",
  icon: Handshake,
  items: [
    { to: "/admin/affiliates", label: "War Room affiliés", icon: Radio },
    { to: "/admin/affiliates/assign", label: "Attribuer des prospects", icon: UserCheck },
    { to: "/admin/affiliates/attribution", label: "Attribution", icon: Network },
    { to: "/admin/affiliates/dashboard", label: "Tableau de bord", icon: BarChart3 },
    { to: "/admin/partenaires", label: "Partenaires", icon: Handshake },
    { to: "/admin/partner-applications", label: "Candidatures", icon: FileText },
    { to: "/admin/reward-rules", label: "Règles de commission", icon: Tag },
  ],
};

/* ------------------------------------------------------------------ */
/* Operations / Avancé — collapsed by default                           */
/* ------------------------------------------------------------------ */

export const adminAdvancedGroups: NavGroup[] = [
  {
    key: "alex", label: "Alex & IA", icon: Sparkles,
    items: [
      { to: "/admin/agents", label: "Agents IA", icon: Brain },
      { to: "/admin/answer-engine", label: "Base de connaissances", icon: Cpu },
      { to: "/admin/alex-prompt-rules", label: "Règles de prompt", icon: FileText },
      { to: "/admin/alex-knowledge-plans", label: "Connaissances plans", icon: LayoutList },
      { to: "/admin/alex-response-audit", label: "Audit des réponses", icon: SearchCheck },
      { to: "/admin/alex-conversation-debug", label: "Debug conversation", icon: TestTube },
      { to: "/admin/alex/voice-lab", label: "Voice Lab", icon: Radio },
      { to: "/admin/voice-health", label: "Santé voix", icon: Heart },
      { to: "/admin/voice-pronunciation", label: "Prononciation", icon: Wand2 },
      { to: "/admin/smart-context", label: "Smart Context", icon: Brain },
      { to: "/admin/ai-entities", label: "Entités IA", icon: Network },
      { to: "/admin/ai-trust", label: "AI Trust", icon: Shield },
    ],
  },
  {
    key: "outbound", label: "Outbound avancé", icon: Send,
    items: [
      { to: "/admin/outbound/ops", label: "Pipeline", icon: Activity },
      { to: "/admin/outbound/campaigns", label: "Campagnes", icon: Rocket },
      { to: "/admin/outbound/leads", label: "Prospects outbound", icon: Users },
      { to: "/admin/outbound/runs", label: "Exécutions", icon: Activity },
      { to: "/admin/outbound/approvals", label: "Approbations", icon: ShieldCheck },
      { to: "/admin/outbound/autopilot/runs", label: "Autopilot", icon: Bot },
      { to: "/admin/outbound/cities", label: "Villes", icon: MapPin },
      { to: "/admin/outbound/targets", label: "Marchés", icon: Target },
      { to: "/admin/outbound/mailboxes", label: "Boîtes courriel", icon: Inbox },
      { to: "/admin/outbound/email-health", label: "Santé courriel", icon: Heart },
      { to: "/admin/outbound/deliverability", label: "Délivrabilité", icon: Activity },
      { to: "/admin/outbound/ai-rewrite", label: "Personnalisation IA", icon: Cpu },
      { to: "/admin/outbound/suppressions", label: "Suppressions", icon: Ban },
      { to: "/admin/outbound/send-windows", label: "Fenêtres d'envoi", icon: Clock },
      { to: "/admin/outbound/sending-architecture", label: "Architecture d'envoi", icon: Server },
      { to: "/admin/outbound/diagnostics", label: "Diagnostics", icon: AlertTriangle },
      { to: "/admin/outbound/tests", label: "Tests", icon: TestTube },
      { to: "/admin/outbound/logs", label: "Journaux", icon: ScrollText },
      { to: "/admin/outbound/settings", label: "Réglages", icon: Settings },
      { to: "/admin/outreach-health", label: "Santé outreach", icon: Heart },
      { to: "/admin/outreach-errors", label: "Erreurs outreach", icon: AlertTriangle },
      { to: "/admin/email-templates", label: "Gabarits courriel", icon: Mail },
      { to: "/admin/sms-health", label: "Santé SMS", icon: Smartphone },
      { to: "/admin/sms-images", label: "Images SMS", icon: ImageIcon },
    ],
  },
  {
    key: "pipeline", label: "Pipeline acquisition", icon: Network,
    items: [
      { to: "/admin/acquisition-machine", label: "Acquisition Machine", icon: Bot },
      { to: "/admin/acquisition/pipeline", label: "Pipeline détaillé", icon: Activity },
      { to: "/admin/acquisition/engagement", label: "Engagement", icon: TrendingUp },
      { to: "/admin/acquisition/activation", label: "Activation", icon: ShieldCheck },
      { to: "/admin/acquisition/stripe", label: "Stripe acquisition", icon: CreditCard },
      { to: "/admin/acquisition/errors", label: "Erreurs", icon: AlertTriangle },
      { to: "/admin/acquisition/duplicates", label: "Doublons", icon: Grid3X3 },
      { to: "/admin/acquisition-diagnostics", label: "Diagnostics", icon: AlertTriangle },
      { to: "/admin/acquisition-funnel", label: "Entonnoir", icon: BarChart3 },
      { to: "/admin/official-acquisition", label: "Sources officielles", icon: Shield },
      { to: "/admin/official-site-enrichment", label: "Enrichissement sites", icon: Wand2 },
      { to: "/admin/facebook-extraction", label: "Extraction Facebook", icon: Network },
      { to: "/admin/extraction", label: "File d'extraction", icon: LayoutList },
      { to: "/admin/duplicates", label: "Déduplication", icon: Grid3X3 },
      { to: "/admin/normalization", label: "Normalisation", icon: Wand2 },
      { to: "/admin/contact-verification", label: "Vérification contacts", icon: SearchCheck },
      { to: "/admin/commercial-eligibility", label: "Éligibilité commerciale", icon: ShieldCheck },
      { to: "/admin/prospection", label: "Prospection", icon: Target },
      { to: "/admin/prospects", label: "Base prospects", icon: Users },
      { to: "/admin/prospect-execution", label: "Exécution prospects", icon: Activity },
      { to: "/admin/crm", label: "CRM", icon: FolderOpen },
    ],
  },
  {
    key: "growth", label: "Croissance & SEO", icon: BarChart3,
    items: [
      { to: "/admin/growth", label: "Croissance", icon: BarChart3 },
      { to: "/admin/growth-engine", label: "Growth Engine", icon: TrendingUp },
      { to: "/admin/growth-os", label: "Growth OS", icon: Sparkles },
      { to: "/admin/seo-health", label: "Santé SEO", icon: Gauge },
      { to: "/admin/seo-index-health", label: "Indexation", icon: Activity },
      { to: "/admin/seo-domination", label: "SEO Domination", icon: Target },
      { to: "/admin/seo-articles", label: "Articles SEO", icon: FileText },
      { to: "/admin/aeo", label: "AEO Cockpit", icon: Sparkles },
      { to: "/admin/journal", label: "Journal", icon: FileText },
      { to: "/admin/lead-empire", label: "Lead Empire", icon: TrendingUp },
      { to: "/admin/territories", label: "Territoires", icon: MapPin },
      { to: "/admin/zone-value", label: "Zones & exclusivité", icon: MapPin },
      { to: "/admin/capacity-framework", label: "Capacité", icon: Grid3X3 },
      { to: "/admin/demand-grid", label: "Grille de demande", icon: Grid3X3 },
      { to: "/admin/city-activity-matrix", label: "Villes × activités", icon: Grid3X3 },
      { to: "/admin/experiments", label: "Expériences", icon: TestTube },
      { to: "/admin/share-images", label: "Images de partage", icon: ImageIcon },
      { to: "/admin/media", label: "Média IA", icon: Palette },
      { to: "/admin/brand", label: "Marques", icon: Shield },
      { to: "/admin/qr-codes", label: "Codes QR", icon: Grid3X3 },
    ],
  },
  {
    key: "content", label: "Contenu & dossiers", icon: FolderOpen,
    items: [
      { to: "/admin/quotes", label: "Soumissions", icon: FileText },
      { to: "/admin/reviews", label: "Avis", icon: Star },
      { to: "/admin/documents", label: "Documents", icon: FolderOpen },
      { to: "/admin/home-graph", label: "Graphe des problèmes", icon: Network },
      { to: "/admin/content-audit", label: "Audit de contenu", icon: SearchCheck },
      { to: "/admin/content-guard", label: "Content Guard", icon: Shield },
      { to: "/admin/founders", label: "Fondateurs", icon: Star },
      { to: "/admin/founder-invites", label: "Invitations fondateurs", icon: Mail },
    ],
  },
  {
    key: "system", label: "Système & diagnostics", icon: Settings,
    items: [
      { to: "/admin/system-health", label: "Santé système", icon: Heart },
      { to: "/admin/system-integrity", label: "Intégrité système", icon: ShieldCheck },
      { to: "/admin/system-time", label: "Santé horloge", icon: Clock },
      { to: "/admin/system-mode", label: "Mode système", icon: Settings },
      { to: "/admin/edge-function-health", label: "Edge functions", icon: Server },
      { to: "/admin/provider-health", label: "Fournisseurs", icon: Activity },
      { to: "/admin/domain-health", label: "Domaines", icon: Network },
      { to: "/admin/ui-health", label: "Santé UI", icon: Gauge },
      { to: "/admin/site-health", label: "Santé du site", icon: Gauge },
      { to: "/admin/memory-health", label: "Mémoire", icon: Brain },
      { to: "/admin/automation", label: "Kill switch", icon: Ban },
      { to: "/admin/omega", label: "Omega Cockpit", icon: Sparkles },
      { to: "/admin/autonomous-engine", label: "Moteur autonome", icon: Bot },
      { to: "/admin/concierge", label: "Cockpit concierge", icon: Sparkles },
      { to: "/admin/go-live", label: "Go-Live", icon: Rocket },
      { to: "/admin/critical-path-audit", label: "Audit chemin critique", icon: AlertTriangle },
      { to: "/admin/qa-simulation", label: "Simulation QA", icon: TestTube },
      { to: "/admin/replay-pipeline", label: "Rejeu pipeline", icon: Activity },
      { to: "/admin/live-runs", label: "Exécutions en direct", icon: Radio },
      { to: "/admin/nav-analytics", label: "Usage du menu", icon: BarChart3 },
      { to: "/admin/menu-intelligence", label: "Menu Intelligence", icon: BarChart3 },
      { to: "/admin/navigation", label: "Navigation", icon: Compass },
      { to: "/admin/emails", label: "Journaux courriel", icon: ScrollText },
      { to: "/admin/test-sms", label: "Test SMS", icon: Smartphone },
      { to: "/admin/screenshot-analytics", label: "Intel captures", icon: Camera },
      { to: "/admin/google-project-audit", label: "Audit Google", icon: SearchCheck },
      { to: "/admin/optimization", label: "Optimisation", icon: Wand2 },
      { to: "/admin/uos", label: "UNPRO OS", icon: Sparkles },
      { to: "/admin/handoff-analytics", label: "Analytique handoff", icon: BarChart3 },
      { to: "/admin/homeowner-analytics", label: "Analytique propriétaires", icon: BarChart3 },
      { to: "/admin/deep-link-analytics", label: "Deep links", icon: Network },
      { to: "/admin/funnel-audit", label: "Audit entonnoir", icon: SearchCheck },
      { to: "/admin/tunnel-reality", label: "Réalité tunnel", icon: Gauge },
      { to: "/admin/revenue-gate-audit", label: "Audit gate revenu", icon: ShieldCheck },
      { to: "/admin/revenue-path-audit", label: "Audit chemin revenu", icon: SearchCheck },
      { to: "/admin/dynamic-pricing", label: "Tarification dynamique", icon: TrendingUp },
      { to: "/admin/predictive-leads", label: "Leads prédictifs", icon: Brain },
      { to: "/admin/predictive-market-board", label: "Marché prédictif", icon: Zap },
      { to: "/admin/services-secondaires", label: "Services secondaires", icon: Zap },
      { to: "/admin/scout", label: "Scout", icon: Eye },
      { to: "/admin/campaign-center", label: "Centre de campagnes", icon: Rocket },
      { to: "/admin/communications", label: "Communications", icon: Mail },
      { to: "/admin/execution-control", label: "Contrôle d'exécution", icon: Settings },
    ],
  },
];

/**
 * Legacy flat view of the whole menu.
 * Kept so `/admin/nav-analytics` (and any other consumer) keeps working with
 * the same `NavGroup[]` shape it always expected.
 */
export const adminNavGroups: NavGroup[] = [
  ...adminSections.map((s) => ({
    key: s.key,
    label: s.label,
    icon: s.icon,
    items: s.tabs,
  })),
  adminSecondaryGroup,
  ...adminAdvancedGroups.map((g) => ({ ...g, defaultHidden: true })),
];
