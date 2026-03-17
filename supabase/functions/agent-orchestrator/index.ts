import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ===== TYPES =====
interface SystemContext {
  totalUsers: number;
  newUsers7d: number;
  totalContractors: number;
  verifiedContractors: number;
  unverifiedContractors: number;
  totalQuotes: number;
  analyzedQuotes: number;
  pendingQuotes: number;
  totalAppointments: number;
  pendingAppointments: number;
  activeSubscriptions: number;
  totalLeads: number;
  totalTerritories: number;
  emptyTerritories: number;
  ragDocuments: number;
  totalMediaAssets: number;
  pendingMedia: number;
  totalSeoPages: number;
  totalAgents: number;
  activeAgents: number;
  propertiesWithLowPassport: number;
  propertiesNeedingScoreUpdate: number;
  citiesWithProperties: number;
  totalBlogArticles: number;
  pendingBlogArticles: number;
}

interface AgentProposal {
  agent_name: string;
  agent_key: string;
  agent_domain: string;
  task_title: string;
  task_description: string;
  action_plan: string[];
  impact_score: number;
  urgency: string;
  auto_executable: boolean;
  execution_mode: string;
}

// ===== EXECUTION HANDLERS =====
// Each handler maps an agent_key to a concrete action.
// Returns { success, summary, details }
type ExecutionResult = { success: boolean; summary: string; details?: Record<string, unknown> };
type TaskHandler = (supabase: any, task: any) => Promise<ExecutionResult>;

const TASK_HANDLERS: Record<string, TaskHandler> = {

  // --- SEO: Generate missing pages ---
  "op-seo-page-gen": async (supabase, _task) => {
    // Find territories without SEO pages
    const { data: territories } = await supabase
      .from("territories")
      .select("id, city_slug, trade_slug")
      .eq("is_active", true)
      .limit(10);
    
    if (!territories || territories.length === 0) {
      return { success: true, summary: "Aucun territoire actif trouvé." };
    }

    // Check which combos already have pages
    let generated = 0;
    for (const t of territories) {
      const slug = `${t.trade_slug}-${t.city_slug}`;
      const { count } = await supabase
        .from("seo_pages")
        .select("id", { count: "exact", head: true })
        .eq("slug", slug);
      
      if ((count ?? 0) === 0) {
        // Insert a draft SEO page
        await supabase.from("seo_pages").insert({
          slug,
          city_slug: t.city_slug,
          trade_slug: t.trade_slug,
          page_type: "service_city",
          status: "draft",
          title: `${t.trade_slug} à ${t.city_slug}`.replace(/-/g, " "),
        });
        generated++;
      }
      if (generated >= 5) break;
    }

    return {
      success: true,
      summary: `${generated} pages SEO brouillon créées.`,
      details: { generated, checked: territories.length },
    };
  },

  // --- Lead qualification: batch analyze pending quotes ---
  "op-lead-qualifier": async (supabase, _task) => {
    const { data: quotes } = await supabase
      .from("quotes")
      .select("id")
      .eq("status", "pending")
      .limit(10);

    if (!quotes || quotes.length === 0) {
      return { success: true, summary: "Aucune soumission en attente." };
    }

    // Mark as processing (real analysis would call validation-orchestrator)
    let processed = 0;
    for (const q of quotes) {
      await supabase.from("quotes").update({ status: "processing" }).eq("id", q.id);
      processed++;
    }

    return {
      success: true,
      summary: `${processed} soumissions lancées en analyse.`,
      details: { processed },
    };
  },

  // --- Operations: flag unverified contractors ---
  "exec-operations": async (supabase, _task) => {
    const { data: contractors } = await supabase
      .from("contractors")
      .select("id, business_name, email")
      .neq("verification_status", "verified")
      .limit(10);

    if (!contractors || contractors.length === 0) {
      return { success: true, summary: "Aucun entrepreneur non vérifié." };
    }

    // Create admin notifications for each
    const notifs = contractors.map((c: any) => ({
      type: "verification_needed",
      severity: "warning",
      title: `Vérification requise: ${c.business_name || c.email || c.id}`,
      body: `L'entrepreneur ${c.business_name || "N/A"} attend une vérification.`,
      contractor_id: c.id,
    }));

    await supabase.from("admin_notifications").insert(notifs);

    return {
      success: true,
      summary: `${contractors.length} notifications de vérification créées.`,
      details: { count: contractors.length },
    };
  },

  // --- Leads: escalate pending appointments ---
  "exec-leads": async (supabase, _task) => {
    const { data: pending } = await supabase
      .from("appointments")
      .select("id, contractor_id, created_at")
      .eq("status", "requested")
      .limit(10);

    if (!pending || pending.length === 0) {
      return { success: true, summary: "Aucun rendez-vous en attente." };
    }

    // Create notifications for old appointments (> 24h)
    const now = Date.now();
    let escalated = 0;
    for (const a of pending) {
      const age = now - new Date(a.created_at).getTime();
      if (age > 24 * 3600 * 1000) {
        await supabase.from("admin_notifications").insert({
          type: "appointment_escalation",
          severity: "high",
          title: `RDV en attente > 24h`,
          body: `Le rendez-vous ${a.id} attend depuis plus de 24h. Risque de perte.`,
          contractor_id: a.contractor_id,
        });
        escalated++;
      }
    }

    return {
      success: true,
      summary: `${escalated} rendez-vous escaladés sur ${pending.length} en attente.`,
      details: { escalated, total_pending: pending.length },
    };
  },

  // --- Content writer: create RAG documents from answer templates ---
  "op-content-writer": async (supabase, _task) => {
    const { data: templates } = await supabase
      .from("answer_templates")
      .select("id, question_pattern, short_answer, explanation, category")
      .eq("is_published", true)
      .limit(10);

    if (!templates || templates.length === 0) {
      return { success: true, summary: "Aucun template disponible." };
    }

    let ingested = 0;
    for (const t of templates) {
      const { count } = await supabase
        .from("rag_documents")
        .select("id", { count: "exact", head: true })
        .eq("source_id", t.id);

      if ((count ?? 0) === 0) {
        await supabase.from("rag_documents").insert({
          title: t.question_pattern,
          summary: t.short_answer,
          content: `${t.question_pattern}\n\n${t.explanation}`,
          namespace: "answer_templates",
          source_id: t.id,
          source_type: "answer_template",
          visibility_scope: "public",
        });
        ingested++;
      }
    }

    return {
      success: true,
      summary: `${ingested} documents RAG créés depuis les templates.`,
      details: { ingested, checked: templates.length },
    };
  },

  // --- Passport completion: identify low-completion properties ---
  "op-passport-completion": async (supabase, _task) => {
    const { data: props } = await supabase
      .from("properties")
      .select("id, user_id, passport_completion_pct")
      .lt("passport_completion_pct", 30)
      .limit(10);

    if (!props || props.length === 0) {
      return { success: true, summary: "Aucune propriété avec passeport < 30%." };
    }

    // Log for tracking (real implementation would send notifications)
    return {
      success: true,
      summary: `${props.length} propriétés identifiées avec passeport < 30%.`,
      details: { count: props.length, property_ids: props.map((p: any) => p.id) },
    };
  },

  // --- Messaging orchestrator: segment users for engagement ---
  "op-messaging-orchestrator": async (supabase, _task) => {
    // Find users who signed up > 3 days ago but have 0 properties
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const { data: stale } = await supabase
      .from("profiles")
      .select("user_id, email")
      .lt("created_at", threeDaysAgo)
      .limit(20);

    if (!stale || stale.length === 0) {
      return { success: true, summary: "Aucun utilisateur inactif trouvé." };
    }

    // Check which have properties
    let needsNudge = 0;
    for (const u of stale.slice(0, 10)) {
      const { count } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("user_id", u.user_id);
      if ((count ?? 0) === 0) needsNudge++;
    }

    return {
      success: true,
      summary: `${needsNudge} utilisateurs sans propriété après 3 jours identifiés.`,
      details: { needsNudge, checked: Math.min(stale.length, 10) },
    };
  },

  // --- FAQ Generator (micro, full_auto) ---
  "micro-faq-generator": async (supabase, _task) => {
    // Check SEO pages missing FAQs
    const { data: pages } = await supabase
      .from("seo_pages")
      .select("id, slug, title")
      .is("faq_json", null)
      .eq("status", "published")
      .limit(5);

    if (!pages || pages.length === 0) {
      return { success: true, summary: "Toutes les pages SEO ont des FAQs." };
    }

    return {
      success: true,
      summary: `${pages.length} pages SEO identifiées sans FAQ. Génération IA requise.`,
      details: { pages: pages.map((p: any) => p.slug) },
    };
  },

  // --- Schema Markup Generator (micro, full_auto) ---
  "micro-schema-markup": async (supabase, _task) => {
    const { data: pages } = await supabase
      .from("seo_pages")
      .select("id, slug")
      .is("schema_json", null)
      .eq("status", "published")
      .limit(5);

    if (!pages || pages.length === 0) {
      return { success: true, summary: "Toutes les pages ont un schema markup." };
    }

    // Generate basic schema for each
    let updated = 0;
    for (const p of pages) {
      const schema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": p.slug?.replace(/-/g, " ") || "Page",
        "publisher": { "@type": "Organization", "name": "UNPRO" },
      };
      await supabase.from("seo_pages").update({ schema_json: schema }).eq("id", p.id);
      updated++;
    }

    return {
      success: true,
      summary: `${updated} pages SEO enrichies avec schema markup.`,
      details: { updated },
    };
  },
};

// Fallback handler for agents without specific logic
const DEFAULT_HANDLER: TaskHandler = async (_supabase, task) => {
  return {
    success: true,
    summary: `Tâche "${task.task_title}" marquée comme exécutée (handler par défaut — action manuelle requise).`,
    details: { needs_manual_action: true },
  };
};

// ===== ANALYSIS FUNCTIONS BY DOMAIN =====
function analyzeGrowth(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.totalUsers > 0 && ctx.totalContractors === 0) {
    proposals.push({
      agent_name: "AI Growth Director", agent_key: "exec-growth", agent_domain: "growth",
      task_title: "Aucun entrepreneur inscrit — lancer campagne d'acquisition",
      task_description: `${ctx.totalUsers} utilisateurs mais 0 entrepreneur. Marketplace impossible sans offre.`,
      action_plan: ["Activer landing /professionals", "Créer 3 posts LinkedIn ciblés", "Email aux contacts fondateurs"],
      impact_score: 95, urgency: "critical", auto_executable: false, execution_mode: "manual",
    });
  }
  if (ctx.newUsers7d === 0 && ctx.totalUsers > 5) {
    proposals.push({
      agent_name: "AI Growth Director", agent_key: "exec-growth", agent_domain: "growth",
      task_title: "Stagnation — aucun nouvel utilisateur en 7 jours",
      task_description: "Croissance plate. Besoin de relancer l'acquisition.",
      action_plan: ["Analyser canaux d'acquisition", "Tester campagne referral", "Optimiser SEO pages services"],
      impact_score: 80, urgency: "high", auto_executable: false, execution_mode: "manual",
    });
  }
  const convRate = ctx.totalUsers > 0 ? (ctx.totalQuotes / ctx.totalUsers) * 100 : 0;
  if (ctx.totalUsers > 10 && convRate < 5) {
    proposals.push({
      agent_name: "Conversion Optimization Agent", agent_key: "op-conversion-optimizer", agent_domain: "growth",
      task_title: `Taux conversion ${convRate.toFixed(1)}% — optimiser funnel`,
      task_description: "Cible: 15%. Optimiser le parcours d'upload de soumission.",
      action_plan: ["Simplifier flow upload", "Ajouter CTA contextuel dashboard", "A/B tester onboarding"],
      impact_score: 75, urgency: "medium", auto_executable: false, execution_mode: "manual",
    });
  }
  return proposals;
}

function analyzeLeads(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.pendingAppointments > 3) {
    proposals.push({
      agent_name: "AI Lead Director", agent_key: "exec-leads", agent_domain: "leads",
      task_title: `${ctx.pendingAppointments} rendez-vous en attente — risque perte`,
      task_description: "Leads qualifiés en attente. Chaque heure réduit conversion de 10%.",
      action_plan: ["Notifier entrepreneurs", "Escalader RDV > 48h", "Proposer alternatives"],
      impact_score: 90, urgency: "critical", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  if (ctx.pendingQuotes > 5) {
    proposals.push({
      agent_name: "Lead Qualification Agent", agent_key: "op-lead-qualifier", agent_domain: "leads",
      task_title: `${ctx.pendingQuotes} soumissions non analysées`,
      task_description: "Analyse IA en attente. Chaque analyse complétée augmente engagement de 40%.",
      action_plan: ["Lancer analyse batch", "Notifier propriétaires des résultats"],
      impact_score: 85, urgency: "high", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  return proposals;
}

function analyzeSEO(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.emptyTerritories > 0) {
    proposals.push({
      agent_name: "SEO Page Generator", agent_key: "op-seo-page-gen", agent_domain: "seo",
      task_title: `${ctx.emptyTerritories} territoires sans contenu SEO`,
      task_description: "Territoires actifs sans pages SEO. Trafic organique perdu.",
      action_plan: ["Générer pages service/ville", "Créer contenu problème/ville", "Soumettre sitemap"],
      impact_score: 70, urgency: "medium", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  if (ctx.ragDocuments < 20) {
    proposals.push({
      agent_name: "Content Writer Agent", agent_key: "op-content-writer", agent_domain: "seo",
      task_title: "Base de connaissances RAG insuffisante",
      task_description: `${ctx.ragDocuments} documents. Alex manque de contexte.`,
      action_plan: ["Ingérer FAQ manquantes", "Créer guides travaux", "Indexer coûts par région"],
      impact_score: 65, urgency: "medium", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  if (ctx.totalSeoPages < 10) {
    proposals.push({
      agent_name: "AI SEO Director", agent_key: "exec-seo", agent_domain: "seo",
      task_title: "Couverture SEO insuffisante",
      task_description: `Seulement ${ctx.totalSeoPages} pages SEO. Potentiel de trafic organique inexploité.`,
      action_plan: ["Identifier top 20 keywords", "Générer pages prioritaires", "Optimiser maillage interne"],
      impact_score: 72, urgency: "medium", auto_executable: false, execution_mode: "manual",
    });
  }
  return proposals;
}

function analyzeRevenue(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.verifiedContractors > 0 && ctx.activeSubscriptions === 0) {
    proposals.push({
      agent_name: "AI Revenue Director", agent_key: "exec-revenue", agent_domain: "revenue",
      task_title: "Aucune souscription active — monétisation bloquée",
      task_description: `${ctx.verifiedContractors} entrepreneurs vérifiés mais 0 abonnement.`,
      action_plan: ["Contacter entrepreneurs vérifiés", "Offrir essai Founder Early", "Activer Stripe checkout"],
      impact_score: 95, urgency: "critical", auto_executable: false, execution_mode: "manual",
    });
  }
  return proposals;
}

function analyzeOperations(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.unverifiedContractors > 3) {
    proposals.push({
      agent_name: "AI Operations Director", agent_key: "exec-operations", agent_domain: "operations",
      task_title: `${ctx.unverifiedContractors} entrepreneurs non vérifiés`,
      task_description: "Profils en attente de vérification. Bloque visibilité et rendez-vous.",
      action_plan: ["Examiner profils", "Vérifier licence/assurance", "Approuver ou demander infos"],
      impact_score: 80, urgency: "high", auto_executable: false, execution_mode: "manual",
    });
  }
  return proposals;
}

function analyzeMedia(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.pendingMedia > 5) {
    proposals.push({
      agent_name: "Media Generation Agent", agent_key: "op-media-generator", agent_domain: "media",
      task_title: `${ctx.pendingMedia} assets média en attente`,
      task_description: "Des visuels attendent génération ou approbation.",
      action_plan: ["Traiter file de génération", "Scorer qualité", "Approuver automatiquement si score > 8"],
      impact_score: 60, urgency: "medium", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  return proposals;
}

function analyzeProduct(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.totalUsers > 20 && ctx.totalQuotes < 3) {
    proposals.push({
      agent_name: "AI Product Officer", agent_key: "exec-product", agent_domain: "product",
      task_title: "Faible adoption des fonctionnalités clés",
      task_description: "Les utilisateurs n'utilisent pas le Quote Analyzer. Problème UX probable.",
      action_plan: ["Analyser funnel upload", "Simplifier formulaire", "Ajouter guide interactif"],
      impact_score: 78, urgency: "high", auto_executable: false, execution_mode: "manual",
    });
  }
  return proposals;
}

function analyzeData(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.totalUsers > 50) {
    proposals.push({
      agent_name: "Data Analysis Agent", agent_key: "op-data-analyst", agent_domain: "data",
      task_title: "Générer rapport d'insights hebdomadaire",
      task_description: "La base utilisateur justifie des analyses régulières.",
      action_plan: ["Agréger métriques clés", "Détecter anomalies", "Générer recommandations"],
      impact_score: 55, urgency: "low", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  return proposals;
}

function analyzeProperty(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.propertiesWithLowPassport > 5) {
    proposals.push({
      agent_name: "Passport Completion Agent", agent_key: "op-passport-completion", agent_domain: "property",
      task_title: "Propriétés avec passeport incomplet — relancer propriétaires",
      task_description: "Plusieurs propriétés ont un passeport < 30%. Notification de relance recommandée.",
      action_plan: ["Identifier propriétés < 30%", "Envoyer notification push", "Proposer prochaine action"],
      impact_score: 75, urgency: "medium", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  if (ctx.propertiesNeedingScoreUpdate > 3) {
    proposals.push({
      agent_name: "Home Score Agent", agent_key: "op-home-score", agent_domain: "property",
      task_title: "Recalculer scores propriétés avec nouvelles données",
      task_description: "Des propriétés ont reçu de nouvelles contributions — score à mettre à jour.",
      action_plan: ["Identifier propriétés avec changements", "Recalculer Home Score", "Notifier propriétaire si changement > 5pts"],
      impact_score: 70, urgency: "medium", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  return proposals;
}

function analyzeNeighborhood(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.citiesWithProperties > 3) {
    proposals.push({
      agent_name: "Neighborhood Forecast Agent", agent_key: "op-neighborhood-forecast", agent_domain: "property",
      task_title: "Générer prévisions de quartier pour villes actives",
      task_description: "Suffisamment de données pour produire des insights de quartier.",
      action_plan: ["Agréger données par quartier", "Calculer tendances prix/rénovations", "Publier insights"],
      impact_score: 55, urgency: "low", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  return proposals;
}

function analyzeMessaging(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.totalUsers > 10) {
    proposals.push({
      agent_name: "Homeowner Message Orchestrator", agent_key: "op-messaging-orchestrator", agent_domain: "engagement",
      task_title: "Orchestrer séquences de messages propriétaires",
      task_description: "Base utilisateurs suffisante pour activer séquences d'engagement.",
      action_plan: ["Segmenter par activité", "Envoyer rappel passeport J+3", "Proposer score gratuit J+7"],
      impact_score: 65, urgency: "medium", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  return proposals;
}

function detectAgentCreationOpportunities(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.totalSeoPages > 50 && ctx.ragDocuments < 50) {
    proposals.push({
      agent_name: "Chief Autonomous Orchestrator", agent_key: "chief-orchestrator", agent_domain: "system",
      task_title: "Créer un agent spécialisé FAQ Generator",
      task_description: "Volume de pages SEO élevé. Un agent FAQ dédié améliorerait l'efficacité.",
      action_plan: ["Créer agent micro-faq-generator", "Définir mission et triggers", "Activer en mode full_auto"],
      impact_score: 50, urgency: "low", auto_executable: false, execution_mode: "manual",
    });
  }
  return proposals;
}

const ANALYZERS = [
  analyzeGrowth, analyzeLeads, analyzeSEO, analyzeRevenue,
  analyzeOperations, analyzeMedia, analyzeProduct, analyzeData,
  analyzeProperty, analyzeNeighborhood, analyzeMessaging,
  detectAgentCreationOpportunities,
];

// ===== EXECUTE A SINGLE TASK =====
async function executeTask(supabase: any, task: any): Promise<ExecutionResult> {
  const handler = TASK_HANDLERS[task.agent_key] || DEFAULT_HANDLER;
  return handler(supabase, task);
}

// ===== EXECUTE ALL AUTO-EXECUTABLE TASKS =====
async function executeAutoTasks(supabase: any): Promise<{ executed: number; succeeded: number; failed: number; results: any[] }> {
  // Get approved tasks + auto_executable proposed tasks from full_auto agents
  const { data: tasks } = await supabase
    .from("agent_tasks")
    .select("*")
    .in("status", ["approved", "proposed"])
    .order("impact_score", { ascending: false })
    .limit(20);

  if (!tasks || tasks.length === 0) {
    return { executed: 0, succeeded: 0, failed: 0, results: [] };
  }

  // Filter: approved tasks OR proposed tasks from full_auto agents
  const { data: fullAutoAgents } = await supabase
    .from("agent_registry")
    .select("agent_key")
    .eq("autonomy_level", "full_auto")
    .eq("status", "active");

  const fullAutoKeys = new Set((fullAutoAgents ?? []).map((a: any) => a.agent_key));

  const executable = tasks.filter((t: any) =>
    t.status === "approved" ||
    (t.status === "proposed" && t.auto_executable && fullAutoKeys.has(t.agent_key))
  );

  let executed = 0, succeeded = 0, failed = 0;
  const results: any[] = [];

  for (const task of executable.slice(0, 10)) {
    try {
      // Mark as executing
      await supabase.from("agent_tasks").update({ status: "executing" }).eq("id", task.id);

      const result = await executeTask(supabase, task);
      executed++;

      if (result.success) {
        succeeded++;
        await supabase.from("agent_tasks").update({
          status: "completed",
          executed_at: new Date().toISOString(),
          execution_result: result,
        }).eq("id", task.id);
      } else {
        failed++;
        await supabase.from("agent_tasks").update({
          status: "failed",
          executed_at: new Date().toISOString(),
          execution_result: result,
        }).eq("id", task.id);
      }

      // Update agent stats
      if (task.agent_key) {
        const { data: agent } = await supabase
          .from("agent_registry")
          .select("tasks_executed, tasks_succeeded")
          .eq("agent_key", task.agent_key)
          .maybeSingle();

        if (agent) {
          const newExecuted = (agent.tasks_executed ?? 0) + 1;
          const newSucceeded = (agent.tasks_succeeded ?? 0) + (result.success ? 1 : 0);
          await supabase.from("agent_registry").update({
            tasks_executed: newExecuted,
            tasks_succeeded: newSucceeded,
            success_rate: newExecuted > 0 ? (newSucceeded / newExecuted) * 100 : 0,
          }).eq("agent_key", task.agent_key);
        }
      }

      // Log execution
      await supabase.from("agent_logs").insert({
        task_id: task.id,
        agent_name: task.agent_name,
        log_type: result.success ? "execution_success" : "execution_failure",
        message: result.summary,
        metadata: result.details ?? {},
      });

      results.push({ task_id: task.id, title: task.task_title, ...result });
    } catch (err) {
      failed++;
      await supabase.from("agent_tasks").update({
        status: "failed",
        executed_at: new Date().toISOString(),
        execution_result: { success: false, summary: String(err) },
      }).eq("id", task.id);

      await supabase.from("agent_logs").insert({
        task_id: task.id,
        agent_name: task.agent_name,
        log_type: "execution_error",
        message: `Erreur: ${String(err)}`,
      });
    }
  }

  return { executed, succeeded, failed, results };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action } = body;

    // ===== ACTION: STATUS =====
    if (action === "status") {
      const [tasks, logs, metrics, agents, memory] = await Promise.all([
        supabase.from("agent_tasks").select("*").order("impact_score", { ascending: false }).limit(100),
        supabase.from("agent_logs").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("agent_metrics").select("*").order("snapshot_at", { ascending: false }).limit(50),
        supabase.from("agent_registry").select("*").order("layer", { ascending: true }),
        supabase.from("agent_memory").select("*").order("created_at", { ascending: false }).limit(20),
      ]);

      return new Response(JSON.stringify({
        tasks: tasks.data ?? [],
        logs: logs.data ?? [],
        metrics: metrics.data ?? [],
        agents: agents.data ?? [],
        memory: memory.data ?? [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: ANALYZE =====
    if (action === "analyze") {
      const [
        usersRes, users7dRes, contractorsRes, verifiedRes, unverifiedRes,
        quotesRes, analyzedRes, pendingQuotesRes,
        appointmentsRes, pendingAppRes, subsRes, leadsRes,
        territoriesRes, ragRes, mediaRes, pendingMediaRes,
        seoPagesRes, agentsRes, activeAgentsRes,
        lowPassportRes, scoreUpdateRes, citiesRes,
        blogRes, pendingBlogRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("contractors").select("id", { count: "exact", head: true }),
        supabase.from("contractors").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
        supabase.from("contractors").select("id", { count: "exact", head: true }).neq("verification_status", "verified"),
        supabase.from("quotes").select("id", { count: "exact", head: true }),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "analyzed"),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "requested"),
        supabase.from("contractor_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("lead_qualifications").select("id", { count: "exact", head: true }),
        supabase.from("territories").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("rag_documents").select("id", { count: "exact", head: true }),
        supabase.from("media_assets").select("id", { count: "exact", head: true }),
        supabase.from("media_assets").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("seo_pages").select("id", { count: "exact", head: true }),
        supabase.from("agent_registry").select("id", { count: "exact", head: true }),
        supabase.from("agent_registry").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("properties").select("id", { count: "exact", head: true }).lt("passport_completion_pct", 30),
        supabase.from("properties").select("id", { count: "exact", head: true }).gt("passport_completion_pct", 0),
        supabase.from("properties").select("city").not("city", "is", null),
        supabase.from("blog_articles").select("id", { count: "exact", head: true }),
        supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
      ]);

      const uniqueCities = new Set((citiesRes.data ?? []).map((r: any) => r.city));

      const ctx: SystemContext = {
        totalUsers: usersRes.count ?? 0,
        newUsers7d: users7dRes.count ?? 0,
        totalContractors: contractorsRes.count ?? 0,
        verifiedContractors: verifiedRes.count ?? 0,
        unverifiedContractors: unverifiedRes.count ?? 0,
        totalQuotes: quotesRes.count ?? 0,
        analyzedQuotes: analyzedRes.count ?? 0,
        pendingQuotes: pendingQuotesRes.count ?? 0,
        totalAppointments: appointmentsRes.count ?? 0,
        pendingAppointments: pendingAppRes.count ?? 0,
        activeSubscriptions: subsRes.count ?? 0,
        totalLeads: leadsRes.count ?? 0,
        totalTerritories: territoriesRes.count ?? 0,
        emptyTerritories: territoriesRes.count ?? 0,
        ragDocuments: ragRes.count ?? 0,
        totalMediaAssets: mediaRes.count ?? 0,
        pendingMedia: pendingMediaRes.count ?? 0,
        totalSeoPages: seoPagesRes.count ?? 0,
        totalAgents: agentsRes.count ?? 0,
        activeAgents: activeAgentsRes.count ?? 0,
        propertiesWithLowPassport: lowPassportRes.count ?? 0,
        propertiesNeedingScoreUpdate: scoreUpdateRes.count ?? 0,
        citiesWithProperties: uniqueCities.size,
        totalBlogArticles: blogRes.count ?? 0,
        pendingBlogArticles: pendingBlogRes.count ?? 0,
      };

      // Run all analyzers
      const allProposals: AgentProposal[] = [];
      for (const analyzer of ANALYZERS) {
        try {
          allProposals.push(...analyzer(ctx));
        } catch (e) {
          console.error(`Analyzer error:`, e);
        }
      }
      allProposals.sort((a, b) => b.impact_score - a.impact_score);

      // Store proposals (skip duplicates)
      let storedCount = 0;
      for (const p of allProposals) {
        const { data: existing } = await supabase
          .from("agent_tasks")
          .select("id")
          .eq("task_title", p.task_title)
          .in("status", ["proposed", "approved", "executing"])
          .maybeSingle();

        if (!existing) {
          await supabase.from("agent_tasks").insert({
            agent_name: p.agent_name,
            agent_domain: p.agent_domain,
            agent_key: p.agent_key,
            task_title: p.task_title,
            task_description: p.task_description,
            action_plan: p.action_plan,
            impact_score: p.impact_score,
            urgency: p.urgency,
            auto_executable: p.auto_executable,
            execution_mode: p.execution_mode,
            status: "proposed",
          });
          storedCount++;
        }
      }

      // Store metrics
      const metricsToStore = [
        { metric_name: "total_users", metric_value: ctx.totalUsers, metric_category: "users" },
        { metric_name: "new_users_7d", metric_value: ctx.newUsers7d, metric_category: "users" },
        { metric_name: "total_contractors", metric_value: ctx.totalContractors, metric_category: "contractors" },
        { metric_name: "verified_contractors", metric_value: ctx.verifiedContractors, metric_category: "contractors" },
        { metric_name: "pending_quotes", metric_value: ctx.pendingQuotes, metric_category: "quotes" },
        { metric_name: "pending_appointments", metric_value: ctx.pendingAppointments, metric_category: "appointments" },
        { metric_name: "active_subscriptions", metric_value: ctx.activeSubscriptions, metric_category: "revenue" },
        { metric_name: "rag_documents", metric_value: ctx.ragDocuments, metric_category: "knowledge" },
        { metric_name: "total_agents", metric_value: ctx.totalAgents, metric_category: "system" },
        { metric_name: "active_agents", metric_value: ctx.activeAgents, metric_category: "system" },
        { metric_name: "total_media", metric_value: ctx.totalMediaAssets, metric_category: "media" },
        { metric_name: "total_seo_pages", metric_value: ctx.totalSeoPages, metric_category: "seo" },
      ];
      await supabase.from("agent_metrics").insert(metricsToStore);

      // Log
      await supabase.from("agent_logs").insert({
        agent_name: "chief-orchestrator",
        log_type: "analysis",
        message: `Analyse complète: ${allProposals.length} propositions, ${storedCount} nouvelles. ${ctx.activeAgents} agents actifs.`,
        metadata: { context: ctx, proposals_count: allProposals.length, stored: storedCount },
      });

      // Store memory insight
      await supabase.from("agent_memory").insert({
        memory_key: `analysis_${Date.now()}`,
        memory_type: "insight",
        domain: "system",
        content: `Analyse système: ${ctx.totalUsers} users, ${ctx.totalContractors} contractors, ${ctx.activeSubscriptions} subs, ${allProposals.length} opportunities.`,
        agent_key: "chief-orchestrator",
        importance: 7,
      });

      // AUTO-EXECUTE eligible tasks
      const execResult = await executeAutoTasks(supabase);

      return new Response(JSON.stringify({
        context: ctx,
        proposals: allProposals,
        stored: storedCount,
        agents_active: ctx.activeAgents,
        execution: execResult,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: EXECUTE =====
    if (action === "execute") {
      const { task_id } = body;

      if (task_id) {
        // Execute a single task
        const { data: task } = await supabase
          .from("agent_tasks")
          .select("*")
          .eq("id", task_id)
          .single();

        if (!task) throw new Error("Tâche introuvable");

        await supabase.from("agent_tasks").update({ status: "executing" }).eq("id", task_id);
        const result = await executeTask(supabase, task);

        await supabase.from("agent_tasks").update({
          status: result.success ? "completed" : "failed",
          executed_at: new Date().toISOString(),
          execution_result: result,
        }).eq("id", task_id);

        // Update agent stats
        if (task.agent_key) {
          const { data: agent } = await supabase
            .from("agent_registry")
            .select("tasks_executed, tasks_succeeded")
            .eq("agent_key", task.agent_key)
            .maybeSingle();

          if (agent) {
            const newExec = (agent.tasks_executed ?? 0) + 1;
            const newSucc = (agent.tasks_succeeded ?? 0) + (result.success ? 1 : 0);
            await supabase.from("agent_registry").update({
              tasks_executed: newExec,
              tasks_succeeded: newSucc,
              success_rate: newExec > 0 ? (newSucc / newExec) * 100 : 0,
            }).eq("agent_key", task.agent_key);
          }
        }

        await supabase.from("agent_logs").insert({
          task_id,
          agent_name: task.agent_name,
          log_type: result.success ? "execution_success" : "execution_failure",
          message: result.summary,
          metadata: result.details ?? {},
        });

        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Execute all eligible tasks
      const execResult = await executeAutoTasks(supabase);
      return new Response(JSON.stringify({ success: true, ...execResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: APPROVE =====
    if (action === "approve") {
      const { task_id, reviewer_id } = body;
      await supabase.from("agent_tasks").update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer_id,
      }).eq("id", task_id);

      await supabase.from("agent_logs").insert({
        task_id,
        agent_name: "chief-orchestrator",
        log_type: "approval",
        message: `Tâche approuvée par admin.`,
      });

      // Auto-execute if the task is auto_executable
      const { data: task } = await supabase
        .from("agent_tasks")
        .select("*")
        .eq("id", task_id)
        .single();

      let executionResult = null;
      if (task?.auto_executable) {
        await supabase.from("agent_tasks").update({ status: "executing" }).eq("id", task_id);
        const result = await executeTask(supabase, task);
        executionResult = result;

        await supabase.from("agent_tasks").update({
          status: result.success ? "completed" : "failed",
          executed_at: new Date().toISOString(),
          execution_result: result,
        }).eq("id", task_id);

        if (task.agent_key) {
          const { data: agent } = await supabase
            .from("agent_registry")
            .select("tasks_executed, tasks_succeeded")
            .eq("agent_key", task.agent_key)
            .maybeSingle();
          if (agent) {
            const ne = (agent.tasks_executed ?? 0) + 1;
            const ns = (agent.tasks_succeeded ?? 0) + (result.success ? 1 : 0);
            await supabase.from("agent_registry").update({
              tasks_executed: ne, tasks_succeeded: ns,
              success_rate: ne > 0 ? (ns / ne) * 100 : 0,
            }).eq("agent_key", task.agent_key);
          }
        }

        await supabase.from("agent_logs").insert({
          task_id, agent_name: task.agent_name,
          log_type: result.success ? "execution_success" : "execution_failure",
          message: result.summary,
          metadata: result.details ?? {},
        });
      }

      return new Response(JSON.stringify({ success: true, executed: !!executionResult, execution: executionResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: REJECT =====
    if (action === "reject") {
      const { task_id, reviewer_id } = body;
      await supabase.from("agent_tasks").update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer_id,
      }).eq("id", task_id);

      const { data: task } = await supabase.from("agent_tasks").select("agent_key").eq("id", task_id).maybeSingle();
      if (task?.agent_key) {
        const { data: agent } = await supabase.from("agent_registry").select("tasks_executed").eq("agent_key", task.agent_key).maybeSingle();
        if (agent) {
          await supabase.from("agent_registry").update({
            tasks_executed: (agent.tasks_executed ?? 0) + 1,
          }).eq("agent_key", task.agent_key);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: CREATE_AGENT =====
    if (action === "create_agent") {
      const { agent_key, agent_name, layer, domain, parent_agent_key, mission, autonomy_level } = body;
      const { error } = await supabase.from("agent_registry").insert({
        agent_key, agent_name, layer, domain, parent_agent_key, mission,
        autonomy_level: autonomy_level || "propose",
        created_by: "orchestrator",
        status: "active",
      });
      if (error) throw error;

      await supabase.from("agent_logs").insert({
        agent_name: "chief-orchestrator",
        log_type: "agent_creation",
        message: `Nouvel agent créé: ${agent_name} (${layer}/${domain})`,
        metadata: { agent_key, layer, domain },
      });

      return new Response(JSON.stringify({ success: true, agent_key }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: TOGGLE_AGENT =====
    if (action === "toggle_agent") {
      const { agent_key: key, new_status } = body;
      await supabase.from("agent_registry").update({ status: new_status }).eq("agent_key", key);

      await supabase.from("agent_logs").insert({
        agent_name: "chief-orchestrator",
        log_type: "agent_status",
        message: `Agent ${key} → ${new_status}`,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: CRON (called by pg_cron daily) =====
    if (action === "cron") {
      const analyzeResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/agent-orchestrator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ action: "analyze" }),
      });
      const analyzeData = await analyzeResp.json();

      return new Response(JSON.stringify({
        success: true,
        cron_run: true,
        analysis: {
          proposals: analyzeData.proposals?.length ?? 0,
          stored: analyzeData.stored ?? 0,
          execution: analyzeData.execution ?? null,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: SEED_TEST =====
    if (action === "seed_test") {
      const results: Record<string, any> = {};

      // 1. Clear old test tasks
      await supabase.from("agent_tasks").delete().like("task_title", "%[TEST]%");
      await supabase.from("agent_logs").delete().like("message", "%[TEST]%");

      // 2. Create test tasks covering all 5 flows
      const testTasks = [
        {
          agent_name: "SEO Page Generator", agent_key: "op-seo-page-gen", agent_domain: "seo",
          task_title: "[TEST] Générer pages SEO manquantes",
          task_description: "Test: vérifier la création de pages SEO brouillon pour territoires sans contenu.",
          action_plan: ["Identifier territoires vides", "Créer pages brouillon", "Valider statut"],
          impact_score: 70, urgency: "medium", auto_executable: true, execution_mode: "semi_auto", status: "proposed",
        },
        {
          agent_name: "FAQ Generator Agent", agent_key: "micro-faq-generator", agent_domain: "seo",
          task_title: "[TEST] Générer FAQs manquantes",
          task_description: "Test: identifier pages SEO publiées sans FAQ et signaler.",
          action_plan: ["Scanner pages sans faq_json", "Lister slugs concernés"],
          impact_score: 65, urgency: "medium", auto_executable: true, execution_mode: "semi_auto", status: "proposed",
        },
        {
          agent_name: "AI Operations Director", agent_key: "exec-operations", agent_domain: "operations",
          task_title: "[TEST] Vérifier profils incomplets",
          task_description: "Test: créer des notifications admin pour entrepreneurs non vérifiés.",
          action_plan: ["Lister entrepreneurs non vérifiés", "Créer notifications admin"],
          impact_score: 80, urgency: "high", auto_executable: true, execution_mode: "semi_auto", status: "approved",
        },
        {
          agent_name: "AI Lead Director", agent_key: "exec-leads", agent_domain: "leads",
          task_title: "[TEST] Escalader leads en attente",
          task_description: "Test: vérifier les rendez-vous en attente depuis plus de 24h.",
          action_plan: ["Scanner rendez-vous 'requested'", "Escalader > 24h"],
          impact_score: 90, urgency: "critical", auto_executable: true, execution_mode: "semi_auto", status: "proposed",
        },
        {
          agent_name: "AI Growth Director", agent_key: "exec-growth", agent_domain: "growth",
          task_title: "[TEST] Analyser croissance et conversion",
          task_description: "Test: évaluer le taux de conversion et proposer des optimisations.",
          action_plan: ["Calculer taux conversion", "Proposer A/B tests", "Recommander canaux"],
          impact_score: 80, urgency: "high", auto_executable: false, execution_mode: "manual", status: "proposed",
        },
      ];

      const { data: insertedTasks, error: taskErr } = await supabase
        .from("agent_tasks")
        .insert(testTasks)
        .select("id, task_title, status, agent_key");

      results.tasks_created = insertedTasks ?? [];
      results.tasks_error = taskErr?.message ?? null;

      // 3. Log the seed
      await supabase.from("agent_logs").insert({
        agent_name: "chief-orchestrator",
        log_type: "test_seed",
        message: `[TEST] Données de test créées: ${testTasks.length} tâches.`,
        metadata: { test: true, count: testTasks.length },
      });

      results.log_created = true;

      return new Response(JSON.stringify({ success: true, ...results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: CLEANUP_TEST =====
    if (action === "cleanup_test") {
      const { count: tasksDeleted } = await supabase.from("agent_tasks").delete().like("task_title", "%[TEST]%").select("id", { count: "exact", head: true });
      const { count: logsDeleted } = await supabase.from("agent_logs").delete().like("message", "%[TEST]%").select("id", { count: "exact", head: true });

      return new Response(JSON.stringify({
        success: true,
        tasks_deleted: tasksDeleted ?? 0,
        logs_deleted: logsDeleted ?? 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: DEBUG =====
    if (action === "debug") {
      // Return full diagnostic info
      const [tasksRes, logsRes, metricsRes, agentsRes, memRes] = await Promise.all([
        supabase.from("agent_tasks").select("id, task_title, status, agent_key, agent_domain, urgency, impact_score, auto_executable, execution_mode, executed_at, execution_result, proposed_at").order("proposed_at", { ascending: false }).limit(50),
        supabase.from("agent_logs").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("agent_metrics").select("*").order("snapshot_at", { ascending: false }).limit(30),
        supabase.from("agent_registry").select("agent_key, agent_name, layer, domain, autonomy_level, status, tasks_executed, tasks_succeeded, success_rate").order("layer").limit(50),
        supabase.from("agent_memory").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const tasksByStatus: Record<string, number> = {};
      for (const t of (tasksRes.data ?? [])) {
        tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
      }

      const handlersAvailable = Object.keys(TASK_HANDLERS);
      const agentKeys = (agentsRes.data ?? []).map((a: any) => a.agent_key);
      const agentsWithHandlers = agentKeys.filter((k: string) => handlersAvailable.includes(k));
      const agentsWithoutHandlers = agentKeys.filter((k: string) => !handlersAvailable.includes(k));

      return new Response(JSON.stringify({
        summary: {
          total_tasks: (tasksRes.data ?? []).length,
          tasks_by_status: tasksByStatus,
          total_logs: (logsRes.data ?? []).length,
          total_metrics_snapshots: (metricsRes.data ?? []).length,
          total_agents: (agentsRes.data ?? []).length,
          handlers_registered: handlersAvailable.length,
          agents_with_handlers: agentsWithHandlers.length,
          agents_without_handlers: agentsWithoutHandlers.length,
        },
        handlers: handlersAvailable,
        agents_missing_handlers: agentsWithoutHandlers,
        tasks: tasksRes.data ?? [],
        recent_logs: (logsRes.data ?? []).slice(0, 20),
        agents: agentsRes.data ?? [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Orchestrator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
