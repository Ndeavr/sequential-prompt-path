/**
 * UNPRO Operating System (UOS) — Audit & Engine Registry Service
 * Maps every engine to its components, checks DB/frontend/backend status.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────

export type ComponentStatus = "done" | "partial" | "todo";

export interface EngineComponent {
  id: string;
  label: string;
  status: ComponentStatus;
  category: "table" | "page" | "edge_function" | "service" | "agent" | "api";
  details?: string;
  missingItems?: string[];
}

export interface UosEngine {
  key: string;
  name: string;
  icon: string;
  mission: string;
  objectives: string[];
  agents: string[];
  autoActions: string[];
  components: EngineComponent[];
  completionPct: number;
  unicornTips?: string[];
}

export interface UosStats {
  totalEngines: number;
  completedComponents: number;
  partialComponents: number;
  todoComponents: number;
  overallPct: number;
}

// ─── Engine Definitions ─────────────────────────────────────────

const ENGINE_DEFINITIONS: Omit<UosEngine, "components" | "completionPct">[] = [
  {
    key: "growth-brain",
    name: "Growth Brain",
    icon: "brain",
    mission: "Analyser trafic, conversion, revenus et tendances marché pour proposer des optimisations produit et marketing.",
    objectives: ["Tableau de bord analytics", "Détection tendances", "Recommandations automatiques", "Prévisions revenus"],
    agents: ["market-intelligence-agent", "marketing-campaign-agent"],
    autoActions: ["Analyse quotidienne des KPIs", "Alertes sur anomalies", "Suggestions d'optimisation hebdomadaires"],
    unicornTips: ["Ajouter tracking UTM automatique sur chaque page SEO", "Créer dashboards embeddables pour investisseurs"],
  },
  {
    key: "acquisition-engine",
    name: "Acquisition Engine",
    icon: "rocket",
    mission: "Générer automatiquement des pages SEO, villes, problèmes et FAQ pour capturer du trafic organique.",
    objectives: ["Pages SEO programmatiques", "Couverture géographique complète", "Domination mots-clés longue traîne", "AEO / AISEO"],
    agents: ["seo-builder-agent", "problem-page-generator", "city-page-generator", "faq-generator"],
    autoActions: ["Génération de blueprints SEO", "Publication par vagues", "Audit qualité contenu", "Maillage interne automatique"],
    unicornTips: ["Activer le mode Massive Blueprint Generation pour 30k+ pages"],
  },
  {
    key: "property-intelligence",
    name: "Property Intelligence",
    icon: "home",
    mission: "Créer un profil intelligent pour chaque propriété avec calcul du Home Score.",
    objectives: ["Passeport Maison numérique", "Home Score V2 (6 dimensions)", "Digital Twin prédictif", "Ingestion documents AI"],
    agents: ["passport-completion-agent", "home-score-agent"],
    autoActions: ["Calcul automatique Home Score", "Extraction entités documents", "Prédictions cycle de vie composants"],
    unicornTips: ["Connecter données municipales pour pré-remplir les profils propriétés"],
  },
  {
    key: "contractor-intelligence",
    name: "Contractor Intelligence",
    icon: "shield",
    mission: "Analyser réputation, certifications et performance de chaque entrepreneur. Calculer le UNPRO Score.",
    objectives: ["Vérification multi-sources (RBQ, NEQ)", "Score AIPP", "Profils AI enrichis", "Détection anomalies"],
    agents: ["contractor-trust-agent", "verification-orchestrator"],
    autoActions: ["Vérification automatique nouvelles inscriptions", "Recalcul scores confiance", "Alertes changements réputation"],
  },
  {
    key: "lead-economy",
    name: "Lead Economy",
    icon: "target",
    mission: "Distribuer les leads intelligemment basé sur demande, offre, distance et qualité.",
    objectives: ["Matching intelligent", "Qualification leads", "Distribution par territoire", "Analyse conversion"],
    agents: ["lead-qualification-agent", "matching-orchestrator"],
    autoActions: ["Scoring automatique des demandes", "Notification entrepreneurs", "Suivi conversion"],
    unicornTips: ["Implémenter un système d'enchères par lead pour les zones à forte demande"],
  },
  {
    key: "pricing-engine",
    name: "Pricing Engine",
    icon: "dollar",
    mission: "Optimiser la tarification des plans entrepreneurs et la monétisation de la plateforme.",
    objectives: ["Plans flexibles", "Add-ons dynamiques", "Checkout optimisé", "Promos intelligentes"],
    agents: ["pricing-optimization-agent"],
    autoActions: ["A/B test prix", "Détection churn", "Upgrade suggestions"],
  },
  {
    key: "trust-engine",
    name: "Trust Engine",
    icon: "lock",
    mission: "Construire et maintenir la confiance entre propriétaires et entrepreneurs.",
    objectives: ["Avis vérifiés", "Badges de confiance", "Résolution conflits", "Transparence données"],
    agents: ["review-delta-agent", "trust-score-agent"],
    autoActions: ["Modération automatique avis", "Calcul badges", "Alertes fraude"],
  },
  {
    key: "automation-engine",
    name: "Automation Engine",
    icon: "bot",
    mission: "Orchestrer tous les agents et jobs automatiques de la plateforme.",
    objectives: ["Scheduler multi-agents", "Adaptive Frequency", "Job queue prioritaire", "Monitoring temps réel"],
    agents: ["All automation agents (20+)"],
    autoActions: ["Exécution planifiée", "Retry automatique", "Throttling intelligent", "Alertes admin"],
  },
  {
    key: "expansion-engine",
    name: "Expansion Engine",
    icon: "globe",
    mission: "Planifier et exécuter l'expansion géographique et catégorielle de la plateforme.",
    objectives: ["Couverture géographique QC → Canada", "Nouvelles catégories de services", "Marchés adjacents (condo, commercial)"],
    agents: ["city-expansion-planner", "category-expansion-planner", "neighborhood-forecast-agent"],
    autoActions: ["Détection marchés sous-desservis", "Planification vagues d'expansion", "Analyse ROI par territoire"],
    unicornTips: ["Lancer les CLSC sous-couverts les plus rentables avant d'attaquer de nouvelles provinces"],
  },
];

// ─── Component Audit Functions ──────────────────────────────────

const TABLE_CHECKS: Record<string, string[]> = {
  "growth-brain": ["platform_events", "agent_metrics", "automation_runs"],
  "acquisition-engine": ["graph_page_blueprints", "home_problems", "geo_areas", "homeowner_questions", "generated_pages_registry"],
  "property-intelligence": ["properties", "property_events", "property_scores", "property_master_records", "ingestion_jobs", "document_entities"],
  "contractor-intelligence": ["contractors", "contractor_aipp_scores", "contractor_credentials", "contractor_verification_runs", "contractor_ai_profiles"],
  "lead-economy": ["appointments", "project_requests", "contractor_services", "contractor_service_areas"],
  "pricing-engine": ["plan_catalog", "checkout_sessions", "contractor_subscriptions", "promo_codes"],
  "trust-engine": ["contractor_reviews", "field_validations", "admin_notifications"],
  "automation-engine": ["automation_agents", "automation_jobs", "automation_runs", "automation_alerts", "automation_settings", "adaptive_frequency_scores"],
  "expansion-engine": ["geo_areas", "cities", "problem_geo_targets", "adaptive_frequency_scores"],
};

const PAGE_CHECKS: Record<string, Array<{ path: string; label: string }>> = {
  "growth-brain": [
    { path: "/admin/growth", label: "Dashboard Croissance" },
    { path: "/admin", label: "Dashboard Admin" },
  ],
  "acquisition-engine": [
    { path: "/admin/home-graph", label: "Home Problem Graph" },
    { path: "/admin/automation", label: "Automation Dashboard" },
    { path: "/problemes", label: "Page Problèmes (SEO)" },
  ],
  "property-intelligence": [
    { path: "/app/homeowner/dashboard", label: "Dashboard Propriétaire" },
    { path: "/app/homeowner/passport", label: "Passeport Maison" },
    { path: "/app/homeowner/home-score", label: "Home Score" },
  ],
  "contractor-intelligence": [
    { path: "/admin/contractors", label: "Admin Entrepreneurs" },
    { path: "/admin/verification", label: "Vérifications" },
    { path: "/admin/verified-contractors", label: "Entrepreneurs Vérifiés" },
  ],
  "lead-economy": [
    { path: "/admin/leads", label: "Admin Leads" },
    { path: "/admin/appointments", label: "Admin Rendez-vous" },
  ],
  "pricing-engine": [
    { path: "/entrepreneurs/tarifs", label: "Page Tarifs" },
  ],
  "trust-engine": [
    { path: "/admin/reviews", label: "Admin Avis" },
    { path: "/admin/alerts", label: "Admin Alertes" },
  ],
  "automation-engine": [
    { path: "/admin/automation", label: "Dashboard Automatisation" },
  ],
  "expansion-engine": [
    { path: "/admin/territories", label: "Admin Territoires" },
    { path: "/admin/home-graph", label: "Home Problem Graph" },
  ],
};

const EDGE_FN_CHECKS: Record<string, string[]> = {
  "growth-brain": [],
  "acquisition-engine": ["seed-home-graph", "sitemap"],
  "property-intelligence": ["compute-property-score", "extract-document-entities", "create-property-from-tax-bill"],
  "contractor-intelligence": ["compute-contractor-score", "verify-contractor", "detect-duplicates"],
  "lead-economy": ["answer-engine"],
  "pricing-engine": ["create-checkout-session", "stripe-webhook", "create-billing-portal"],
  "trust-engine": ["validation-orchestrator"],
  "automation-engine": ["agent-orchestrator"],
  "expansion-engine": ["seed-home-graph"],
};

// Known existing edge functions
const EXISTING_EDGE_FNS = new Set([
  "agent-orchestrator", "alex-chat", "alex-renovation", "analyze-quote-document",
  "analyze-reserve-fund-study", "answer-engine", "check-condo-subscription",
  "compute-contractor-score", "compute-property-score", "condo-growth-engine",
  "condo-stripe-webhook", "create-billing-portal", "create-checkout-session",
  "create-condo-checkout", "create-property-from-tax-bill", "detect-duplicates",
  "elevenlabs-tts", "extract-document-entities", "extract-document-identity",
  "get-places-key", "import-business-website", "media-orchestrator",
  "rag-ingest", "search-gmb-profile", "seed-home-graph", "seed-knowledge-graph",
  "sitemap", "stripe-webhook", "validation-orchestrator", "verify-contractor",
]);

// Known existing routes
const EXISTING_ROUTES = new Set([
  "/admin", "/admin/users", "/admin/contractors", "/admin/territories",
  "/admin/leads", "/admin/appointments", "/admin/quotes", "/admin/reviews",
  "/admin/documents", "/admin/growth", "/admin/agents", "/admin/media",
  "/admin/validation", "/admin/verification", "/admin/alerts",
  "/admin/verified-contractors", "/admin/automation", "/admin/home-graph",
  "/admin/answer-engine", "/admin/operations",
  "/problemes", "/solutions", "/professionnels",
  "/app/homeowner/dashboard", "/app/homeowner/passport", "/app/homeowner/home-score",
  "/entrepreneurs/tarifs",
]);

async function checkTablesExist(tableNames: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  // Use count query to check existence
  for (const t of tableNames) {
    try {
      const { error } = await supabase.from(t as any).select("id", { count: "exact", head: true }).limit(0);
      result.set(t, !error);
    } catch {
      result.set(t, false);
    }
  }
  return result;
}

export async function auditEngine(engineKey: string): Promise<EngineComponent[]> {
  const components: EngineComponent[] = [];
  
  // 1. Check tables
  const tables = TABLE_CHECKS[engineKey] ?? [];
  if (tables.length) {
    const exists = await checkTablesExist(tables);
    for (const t of tables) {
      components.push({
        id: `table-${t}`,
        label: t,
        status: exists.get(t) ? "done" : "todo",
        category: "table",
      });
    }
  }

  // 2. Check pages
  const pages = PAGE_CHECKS[engineKey] ?? [];
  for (const p of pages) {
    components.push({
      id: `page-${p.path}`,
      label: p.label,
      status: EXISTING_ROUTES.has(p.path) ? "done" : "todo",
      category: "page",
    });
  }

  // 3. Check edge functions
  const fns = EDGE_FN_CHECKS[engineKey] ?? [];
  for (const fn of fns) {
    components.push({
      id: `fn-${fn}`,
      label: fn,
      status: EXISTING_EDGE_FNS.has(fn) ? "done" : "todo",
      category: "edge_function",
    });
  }

  return components;
}

export async function auditAllEngines(): Promise<UosEngine[]> {
  const results: UosEngine[] = [];

  for (const def of ENGINE_DEFINITIONS) {
    const components = await auditEngine(def.key);
    const done = components.filter(c => c.status === "done").length;
    const partial = components.filter(c => c.status === "partial").length;
    const total = components.length || 1;
    const completionPct = Math.round(((done + partial * 0.5) / total) * 100);

    results.push({ ...def, components, completionPct });
  }

  return results;
}

export function computeUosStats(engines: UosEngine[]): UosStats {
  let completed = 0, partial = 0, todo = 0;
  for (const e of engines) {
    for (const c of e.components) {
      if (c.status === "done") completed++;
      else if (c.status === "partial") partial++;
      else todo++;
    }
  }
  const total = completed + partial + todo || 1;
  return {
    totalEngines: engines.length,
    completedComponents: completed,
    partialComponents: partial,
    todoComponents: todo,
    overallPct: Math.round(((completed + partial * 0.5) / total) * 100),
  };
}

// ─── Prompt Generator ───────────────────────────────────────────

export function generateModulePrompt(engine: UosEngine, component: EngineComponent): string {
  const todoComponents = engine.components.filter(c => c.status === "todo");
  
  return `# Prompt — Construire le module "${component.label}" pour UNPRO

## Contexte
UNPRO est une plateforme québécoise de mise en relation entre propriétaires et entrepreneurs en construction/rénovation.
Moteur concerné : ${engine.name}
Mission : ${engine.mission}

## Composant à construire
- Type : ${component.category}
- Nom : ${component.label}
- Statut actuel : ${component.status}

## Ce qui existe déjà (✓)
${engine.components.filter(c => c.status === "done").map(c => `- ✓ [${c.category}] ${c.label}`).join("\n") || "- Rien encore"}

## Ce qui manque (○)
${todoComponents.map(c => `- ○ [${c.category}] ${c.label}`).join("\n")}

## Objectifs du moteur
${engine.objectives.map(o => `- ${o}`).join("\n")}

## Agents IA associés
${engine.agents.map(a => `- ${a}`).join("\n")}

## Actions automatiques
${engine.autoActions.map(a => `- ${a}`).join("\n")}

## Demande
Construire le composant "${component.label}" (${component.category}) en respectant :
- Architecture Supabase existante
- RLS admin-only pour les tables de gestion
- Design SaaS premium dark mode
- Compatibilité avec le scheduler multi-agents
- Langue : français du Québec

## Critères d'acceptation
1. Le composant est fonctionnel et connecté à Supabase
2. Il s'intègre dans l'architecture existante
3. Les données sont cohérentes avec les tables existantes
4. L'admin peut voir et gérer le composant`;
}
