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

// ===== SELF-CREATION LOGIC =====
function detectAgentCreationOpportunities(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];

  // If lots of FAQ generation is needed, propose a dedicated agent
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

// ===== ALL ANALYZERS =====
const ANALYZERS = [
  analyzeGrowth, analyzeLeads, analyzeSEO, analyzeRevenue,
  analyzeOperations, analyzeMedia, analyzeProduct, analyzeData,
  detectAgentCreationOpportunities,
];

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
      ]);

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
          .in("status", ["proposed", "approved"])
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

      return new Response(JSON.stringify({
        context: ctx,
        proposals: allProposals,
        stored: storedCount,
        agents_active: ctx.activeAgents,
      }), {
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

      // Update agent stats
      const { data: task } = await supabase.from("agent_tasks").select("agent_key").eq("id", task_id).maybeSingle();
      if (task?.agent_key) {
        await supabase.rpc("has_role", { _user_id: reviewer_id, _role: "admin" }); // just a check
        const { data: agent } = await supabase.from("agent_registry").select("tasks_executed, tasks_succeeded").eq("agent_key", task.agent_key).maybeSingle();
        if (agent) {
          const newExecuted = (agent.tasks_executed ?? 0) + 1;
          const newSucceeded = (agent.tasks_succeeded ?? 0) + 1;
          await supabase.from("agent_registry").update({
            tasks_executed: newExecuted,
            tasks_succeeded: newSucceeded,
            success_rate: newExecuted > 0 ? (newSucceeded / newExecuted) * 100 : 0,
          }).eq("agent_key", task.agent_key);
        }
      }

      await supabase.from("agent_logs").insert({
        task_id,
        agent_name: "chief-orchestrator",
        log_type: "approval",
        message: `Tâche approuvée par admin.`,
      });

      return new Response(JSON.stringify({ success: true }), {
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

      await supabase.from("agent_memory").insert({
        memory_key: `agent_created_${agent_key}`,
        memory_type: "success",
        domain: "system",
        content: `Agent ${agent_name} créé avec succès pour le domaine ${domain}.`,
        agent_key: "chief-orchestrator",
        importance: 8,
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
