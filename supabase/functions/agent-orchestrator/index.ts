import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ===== AGENT DEFINITIONS =====
interface AgentDef {
  name: string;
  domain: string;
  label: string;
  analyze: (ctx: SystemContext) => AgentProposal[];
}

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
}

interface AgentProposal {
  agent_name: string;
  agent_domain: string;
  task_title: string;
  task_description: string;
  action_plan: string[];
  impact_score: number;
  urgency: string;
}

// ===== AGENT: Growth Hacker =====
const growthAgent: AgentDef = {
  name: "ai-growth-hacker",
  domain: "growth",
  label: "AI Growth Hacker",
  analyze: (ctx) => {
    const proposals: AgentProposal[] = [];
    
    if (ctx.totalUsers > 0 && ctx.totalContractors === 0) {
      proposals.push({
        agent_name: "ai-growth-hacker",
        agent_domain: "growth",
        task_title: "Aucun entrepreneur inscrit — lancer campagne d'acquisition",
        task_description: `${ctx.totalUsers} utilisateurs mais 0 entrepreneur. Le marketplace ne peut pas fonctionner sans offre. Action critique.`,
        action_plan: ["Activer la page /professionals comme landing", "Créer 3 posts LinkedIn ciblés", "Envoyer email aux contacts fondateurs"],
        impact_score: 95,
        urgency: "critical",
      });
    }

    if (ctx.newUsers7d === 0 && ctx.totalUsers > 5) {
      proposals.push({
        agent_name: "ai-growth-hacker",
        agent_domain: "growth",
        task_title: "Stagnation — aucun nouvel utilisateur en 7 jours",
        task_description: "La croissance est plate. Il faut relancer l'acquisition.",
        action_plan: ["Analyser les canaux d'acquisition actuels", "Tester une campagne de referral", "Optimiser le SEO des pages de services"],
        impact_score: 80,
        urgency: "high",
      });
    }

    const conversionRate = ctx.totalUsers > 0 ? (ctx.totalQuotes / ctx.totalUsers) * 100 : 0;
    if (ctx.totalUsers > 10 && conversionRate < 5) {
      proposals.push({
        agent_name: "ai-growth-hacker",
        agent_domain: "growth",
        task_title: "Taux de conversion faible — optimiser le funnel",
        task_description: `Seulement ${conversionRate.toFixed(1)}% des utilisateurs uploadent une soumission. Cible: 15%.`,
        action_plan: ["Simplifier le flow d'upload de soumission", "Ajouter CTA contextuel sur le dashboard", "A/B tester le onboarding"],
        impact_score: 75,
        urgency: "medium",
      });
    }

    return proposals;
  },
};

// ===== AGENT: Lead Engine =====
const leadAgent: AgentDef = {
  name: "ai-lead-engine",
  domain: "leads",
  label: "AI Lead Engine",
  analyze: (ctx) => {
    const proposals: AgentProposal[] = [];

    if (ctx.pendingAppointments > 3) {
      proposals.push({
        agent_name: "ai-lead-engine",
        agent_domain: "leads",
        task_title: `${ctx.pendingAppointments} rendez-vous en attente — risque de perte`,
        task_description: "Des leads qualifiés attendent une réponse. Chaque heure de délai réduit le taux de conversion de 10%.",
        action_plan: ["Notifier les entrepreneurs concernés", "Escalader les RDV > 48h", "Proposer un entrepreneur alternatif si aucune réponse"],
        impact_score: 90,
        urgency: "critical",
      });
    }

    if (ctx.pendingQuotes > 5) {
      proposals.push({
        agent_name: "ai-lead-engine",
        agent_domain: "leads",
        task_title: `${ctx.pendingQuotes} soumissions non analysées`,
        task_description: "Des soumissions attendent l'analyse IA. Chaque analyse complétée augmente l'engagement de 40%.",
        action_plan: ["Lancer l'analyse batch des soumissions en attente", "Notifier les propriétaires des résultats"],
        impact_score: 85,
        urgency: "high",
      });
    }

    return proposals;
  },
};

// ===== AGENT: SEO Engine =====
const seoAgent: AgentDef = {
  name: "ai-seo-engine",
  domain: "seo",
  label: "AI SEO Engine",
  analyze: (ctx) => {
    const proposals: AgentProposal[] = [];

    if (ctx.emptyTerritories > 0) {
      proposals.push({
        agent_name: "ai-seo-engine",
        agent_domain: "seo",
        task_title: `${ctx.emptyTerritories} territoires sans contenu SEO`,
        task_description: "Des territoires actifs n'ont pas de pages SEO associées. Opportunité de trafic organique perdue.",
        action_plan: ["Générer les pages service/ville manquantes", "Créer le contenu problème/ville associé", "Soumettre au sitemap"],
        impact_score: 70,
        urgency: "medium",
      });
    }

    if (ctx.ragDocuments < 20) {
      proposals.push({
        agent_name: "ai-seo-engine",
        agent_domain: "seo",
        task_title: "Base de connaissances RAG insuffisante",
        task_description: `Seulement ${ctx.ragDocuments} documents dans le RAG. Alex manque de contexte pour bien répondre.`,
        action_plan: ["Ingérer les FAQ manquantes", "Créer les guides travaux prioritaires", "Indexer les coûts par région"],
        impact_score: 65,
        urgency: "medium",
      });
    }

    return proposals;
  },
};

// ===== AGENT: Revenue Engine =====
const revenueAgent: AgentDef = {
  name: "ai-revenue-engine",
  domain: "revenue",
  label: "AI Revenue Engine",
  analyze: (ctx) => {
    const proposals: AgentProposal[] = [];

    if (ctx.verifiedContractors > 0 && ctx.activeSubscriptions === 0) {
      proposals.push({
        agent_name: "ai-revenue-engine",
        agent_domain: "revenue",
        task_title: "Aucune souscription active — monétisation bloquée",
        task_description: `${ctx.verifiedContractors} entrepreneurs vérifiés mais 0 abonnement. Revenue = 0$.`,
        action_plan: ["Contacter les entrepreneurs vérifiés", "Offrir essai Founder Early", "Activer le flow Stripe checkout"],
        impact_score: 95,
        urgency: "critical",
      });
    }

    return proposals;
  },
};

// ===== AGENT: Operations Manager =====
const opsAgent: AgentDef = {
  name: "ai-operations",
  domain: "operations",
  label: "AI Operations Manager",
  analyze: (ctx) => {
    const proposals: AgentProposal[] = [];

    if (ctx.unverifiedContractors > 3) {
      proposals.push({
        agent_name: "ai-operations",
        agent_domain: "operations",
        task_title: `${ctx.unverifiedContractors} entrepreneurs non vérifiés`,
        task_description: "Des entrepreneurs attendent la vérification. Cela bloque leur visibilité et les rendez-vous.",
        action_plan: ["Examiner les profils en attente", "Vérifier licence et assurance", "Approuver ou demander plus d'infos"],
        impact_score: 80,
        urgency: "high",
      });
    }

    return proposals;
  },
};

// ===== ALL AGENTS =====
const AGENTS: AgentDef[] = [growthAgent, leadAgent, seoAgent, revenueAgent, opsAgent];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action } = await req.json();

    // ===== ACTION: ANALYZE =====
    if (action === "analyze") {
      // Gather system context
      const [
        usersRes, users7dRes, contractorsRes, verifiedRes, unverifiedRes,
        quotesRes, analyzedRes, pendingQuotesRes,
        appointmentsRes, pendingAppRes, subsRes, leadsRes,
        territoriesRes, emptyTerrRes, ragRes,
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
        supabase.from("territories").select("id", { count: "exact", head: true }).eq("is_active", true), // simplified
        supabase.from("rag_documents").select("id", { count: "exact", head: true }),
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
        emptyTerritories: emptyTerrRes.count ?? 0,
        ragDocuments: ragRes.count ?? 0,
      };

      // Run all agents
      const allProposals: AgentProposal[] = [];
      for (const agent of AGENTS) {
        try {
          const proposals = agent.analyze(ctx);
          allProposals.push(...proposals);
        } catch (e) {
          console.error(`Agent ${agent.name} error:`, e);
        }
      }

      // Sort by impact
      allProposals.sort((a, b) => b.impact_score - a.impact_score);

      // Store proposals (skip duplicates)
      for (const proposal of allProposals) {
        const { data: existing } = await supabase
          .from("agent_tasks")
          .select("id")
          .eq("task_title", proposal.task_title)
          .in("status", ["proposed", "approved"])
          .maybeSingle();

        if (!existing) {
          await supabase.from("agent_tasks").insert({
            agent_name: proposal.agent_name,
            agent_domain: proposal.agent_domain,
            task_title: proposal.task_title,
            task_description: proposal.task_description,
            action_plan: proposal.action_plan,
            impact_score: proposal.impact_score,
            urgency: proposal.urgency,
            status: "proposed",
          });
        }
      }

      // Store metrics snapshot
      const metricsToStore = [
        { metric_name: "total_users", metric_value: ctx.totalUsers, metric_category: "users" },
        { metric_name: "new_users_7d", metric_value: ctx.newUsers7d, metric_category: "users" },
        { metric_name: "total_contractors", metric_value: ctx.totalContractors, metric_category: "contractors" },
        { metric_name: "verified_contractors", metric_value: ctx.verifiedContractors, metric_category: "contractors" },
        { metric_name: "pending_quotes", metric_value: ctx.pendingQuotes, metric_category: "quotes" },
        { metric_name: "pending_appointments", metric_value: ctx.pendingAppointments, metric_category: "appointments" },
        { metric_name: "active_subscriptions", metric_value: ctx.activeSubscriptions, metric_category: "revenue" },
        { metric_name: "rag_documents", metric_value: ctx.ragDocuments, metric_category: "knowledge" },
      ];

      await supabase.from("agent_metrics").insert(metricsToStore);

      // Log orchestrator run
      await supabase.from("agent_logs").insert({
        agent_name: "chief-orchestrator",
        log_type: "analysis",
        message: `Analyse complète: ${allProposals.length} propositions générées par ${AGENTS.length} agents.`,
        metadata: { context: ctx, proposals_count: allProposals.length },
      });

      return new Response(JSON.stringify({
        context: ctx,
        proposals: allProposals,
        agents_active: AGENTS.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: APPROVE =====
    if (action === "approve") {
      const { task_id, reviewer_id } = await req.json();
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

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: REJECT =====
    if (action === "reject") {
      const { task_id, reviewer_id } = await req.json();
      await supabase.from("agent_tasks").update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer_id,
      }).eq("id", task_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: GET STATUS =====
    if (action === "status") {
      const [tasks, logs, metrics] = await Promise.all([
        supabase.from("agent_tasks").select("*").order("impact_score", { ascending: false }).limit(50),
        supabase.from("agent_logs").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("agent_metrics").select("*").order("snapshot_at", { ascending: false }).limit(30),
      ]);

      return new Response(JSON.stringify({
        tasks: tasks.data ?? [],
        logs: logs.data ?? [],
        metrics: metrics.data ?? [],
        agents: AGENTS.map(a => ({ name: a.name, domain: a.domain, label: a.label })),
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
