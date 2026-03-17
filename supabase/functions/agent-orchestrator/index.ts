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
  // Extended context for rich sandbox
  seoPagesMissingFaq: number;
  seoPagesTotal: number;
  incompleteContractors: number;
  pendingAppointmentsOld: number;
  territoriesWithoutSeo: number;
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

// ===== SANDBOX BATCH =====
const SANDBOX_PREFIX = "[SANDBOX]";
const SANDBOX_BATCH_KEY = "sandbox_batch_id";

function makeBatchId(): string {
  return `autonomous-test-${Date.now()}`;
}

// ===== EXECUTION HANDLERS =====
type ExecutionResult = { success: boolean; summary: string; details?: Record<string, unknown> };
type TaskHandler = (supabase: any, task: any) => Promise<ExecutionResult>;

const TASK_HANDLERS: Record<string, TaskHandler> = {

  // --- SEO: Generate missing pages ---
  "op-seo-page-gen": async (supabase, _task) => {
    const { data: territories } = await supabase
      .from("territories")
      .select("id, city_slug, category_slug, city_name, category_name")
      .eq("is_active", true)
      .limit(20);
    
    if (!territories || territories.length === 0) {
      return { success: true, summary: "Aucun territoire actif trouvé." };
    }

    let generated = 0;
    const generatedPages: string[] = [];
    for (const t of territories) {
      const slug = `${t.category_slug}-${t.city_slug}`;
      const { count } = await supabase
        .from("seo_pages")
        .select("id", { count: "exact", head: true })
        .eq("slug", slug);
      
      if ((count ?? 0) === 0) {
        const title = `${t.category_name} à ${t.city_name}`;
        await supabase.from("seo_pages").insert({
          slug,
          page_type: "service_city",
          is_published: false,
          title,
          meta_description: `Trouvez les meilleurs professionnels en ${t.category_name.toLowerCase()} à ${t.city_name}. Comparez, vérifiez et engagez en toute confiance.`,
          content_data: {
            generated_by: "op-seo-page-gen",
            territory_id: t.id,
            city_slug: t.city_slug,
            category_slug: t.category_slug,
            sections: [
              { type: "hero", h1: title },
              { type: "intro", text: `Les services de ${t.category_name.toLowerCase()} à ${t.city_name} sont essentiels pour maintenir votre propriété en bon état.` },
              { type: "cta", text: "Comparez les professionnels vérifiés", strength: "strong" },
            ],
          },
        });
        generatedPages.push(slug);
        generated++;
      }
      if (generated >= 8) break;
    }

    return {
      success: true,
      summary: `${generated} pages SEO brouillon créées: ${generatedPages.join(", ")}`,
      details: { generated, checked: territories.length, pages: generatedPages },
    };
  },

  // --- Lead qualification ---
  "op-lead-qualifier": async (supabase, _task) => {
    const { data: quotes } = await supabase
      .from("quotes")
      .select("id")
      .eq("status", "pending")
      .limit(10);

    if (!quotes || quotes.length === 0) {
      return { success: true, summary: "Aucune soumission en attente." };
    }

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

  // --- Operations: flag unverified/incomplete contractors ---
  "exec-operations": async (supabase, _task) => {
    const { data: contractors } = await supabase
      .from("contractors")
      .select("id, business_name, email, description, specialty, city, phone, license_number, years_experience, logo_url, verification_status")
      .limit(50);

    if (!contractors || contractors.length === 0) {
      return { success: true, summary: "Aucun entrepreneur trouvé." };
    }

    const unverified = contractors.filter((c: any) => c.verification_status !== "verified");
    const incomplete: any[] = [];
    
    for (const c of contractors) {
      const missing: string[] = [];
      if (!c.description || c.description.length < 20) missing.push("description");
      if (!c.specialty) missing.push("specialty");
      if (!c.city) missing.push("city");
      if (!c.phone) missing.push("phone");
      if (!c.license_number) missing.push("license_number");
      if (!c.years_experience) missing.push("years_experience");
      if (!c.logo_url) missing.push("logo_url");
      
      if (missing.length >= 3) {
        incomplete.push({ id: c.id, name: c.business_name, missing, missing_count: missing.length });
      }
    }

    const notifs: any[] = [];
    
    for (const c of unverified) {
      notifs.push({
        type: "verification_needed",
        severity: "warning",
        title: `Vérification requise: ${c.business_name || c.email || c.id}`,
        body: `L'entrepreneur ${c.business_name || "N/A"} attend une vérification.`,
        contractor_id: c.id,
      });
    }

    if (notifs.length > 0) {
      await supabase.from("admin_notifications").insert(notifs);
    }

    return {
      success: true,
      summary: `${unverified.length} non-vérifiés, ${incomplete.length} profils incomplets détectés. ${notifs.length} notifications créées.`,
      details: { 
        unverified_count: unverified.length,
        incomplete_count: incomplete.length,
        incomplete_profiles: incomplete.slice(0, 5),
        notifications_created: notifs.length,
      },
    };
  },

  // --- Leads: escalate pending appointments ---
  "exec-leads": async (supabase, _task) => {
    const { data: pending } = await supabase
      .from("appointments")
      .select("id, contractor_id, created_at, homeowner_user_id, project_category, urgency_level")
      .eq("status", "requested")
      .limit(20);

    if (!pending || pending.length === 0) {
      return { success: true, summary: "Aucun rendez-vous en attente." };
    }

    const now = Date.now();
    let escalated = 0;
    const escalatedDetails: any[] = [];
    
    for (const a of pending) {
      const ageHours = (now - new Date(a.created_at).getTime()) / 3600000;
      if (ageHours > 2) {
        await supabase.from("admin_notifications").insert({
          type: "appointment_escalation",
          severity: ageHours > 24 ? "critical" : "high",
          title: `RDV en attente depuis ${Math.round(ageHours)}h`,
          body: `RDV ${a.id.slice(0,8)} (${a.project_category || "non spécifié"}, urgence: ${a.urgency_level || "medium"}) attend depuis ${Math.round(ageHours)}h. Risque de perte.`,
          contractor_id: a.contractor_id,
        });
        escalatedDetails.push({
          id: a.id.slice(0, 8),
          age_hours: Math.round(ageHours),
          category: a.project_category,
          urgency: a.urgency_level,
        });
        escalated++;
      }
    }

    return {
      success: true,
      summary: `${escalated} rendez-vous escaladés sur ${pending.length} en attente.`,
      details: { escalated, total_pending: pending.length, escalated_details: escalatedDetails },
    };
  },

  // --- Content writer ---
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

  // --- Passport completion ---
  "op-passport-completion": async (supabase, _task) => {
    const { data: props } = await supabase
      .from("properties")
      .select("id, user_id, estimated_score, city, property_type, year_built")
      .limit(20);

    if (!props || props.length === 0) {
      return { success: true, summary: "Aucune propriété trouvée." };
    }

    const lowScore = props.filter((p: any) => !p.estimated_score || p.estimated_score < 30);
    const missingData = props.filter((p: any) => !p.property_type || !p.year_built);

    return {
      success: true,
      summary: `${lowScore.length} propriétés avec score < 30, ${missingData.length} avec données manquantes.`,
      details: { 
        low_score_count: lowScore.length,
        missing_data_count: missingData.length,
        properties_analyzed: props.length,
        low_score_ids: lowScore.map((p: any) => p.id.slice(0, 8)),
      },
    };
  },

  // --- Messaging orchestrator ---
  "op-messaging-orchestrator": async (supabase, _task) => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const { data: stale } = await supabase
      .from("profiles")
      .select("user_id, email")
      .lt("created_at", threeDaysAgo)
      .limit(20);

    if (!stale || stale.length === 0) {
      return { success: true, summary: "Aucun utilisateur inactif trouvé." };
    }

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

  // --- FAQ Generator ---
  "micro-faq-generator": async (supabase, _task) => {
    // Check seo_property_type_pages missing FAQs (has faq column)
    const { data: pages } = await supabase
      .from("seo_property_type_pages")
      .select("id, slug, h1")
      .is("faq", null)
      .eq("is_published", true)
      .limit(10);

    // Also check seo_pages without content_data FAQ
    const { data: seoPages } = await supabase
      .from("seo_pages")
      .select("id, slug, title, content_data")
      .eq("is_published", true)
      .limit(20);

    const seoWithoutFaq = (seoPages ?? []).filter((p: any) => {
      const cd = p.content_data;
      return !cd || !cd.faq || (Array.isArray(cd.faq) && cd.faq.length === 0);
    });

    const totalMissing = (pages?.length ?? 0) + seoWithoutFaq.length;

    if (totalMissing === 0) {
      return { success: true, summary: "Toutes les pages publiées ont des FAQs." };
    }

    // Generate basic FAQs for seo_pages
    let generated = 0;
    for (const p of seoWithoutFaq.slice(0, 5)) {
      const faq = [
        { q: `Quel est le coût moyen pour ${p.title?.toLowerCase()}?`, a: `Le coût varie selon la taille du projet, la complexité et la région. Contactez un professionnel vérifié pour une estimation personnalisée.` },
        { q: `Comment choisir un bon professionnel?`, a: `Vérifiez les licences, assurances, avis clients et demandez des références. UNPRO vérifie automatiquement ces éléments.` },
        { q: `Combien de temps durent les travaux?`, a: `La durée dépend de l'ampleur du projet. Un professionnel qualifié peut vous donner un échéancier précis.` },
      ];
      await supabase.from("seo_pages").update({
        content_data: { ...(p.content_data || {}), faq, faq_generated_at: new Date().toISOString() },
      }).eq("id", p.id);
      generated++;
    }

    // Generate FAQs for seo_property_type_pages
    for (const p of (pages ?? []).slice(0, 5)) {
      const faq = [
        { q: `Quels sont les problèmes courants?`, a: `Les problèmes varient selon le type de propriété et l'âge du bâtiment. Une inspection professionnelle est recommandée.` },
        { q: `Comment prévenir les problèmes?`, a: `Un entretien régulier et des inspections périodiques permettent de détecter les problèmes avant qu'ils ne s'aggravent.` },
        { q: `Quand faire appel à un professionnel?`, a: `Dès que vous remarquez des signes de dégradation ou si votre propriété a plus de 20 ans sans inspection récente.` },
      ];
      await supabase.from("seo_property_type_pages").update({ faq }).eq("id", p.id);
      generated++;
    }

    return {
      success: true,
      summary: `${totalMissing} pages sans FAQ détectées. ${generated} FAQs générées.`,
      details: { 
        seo_pages_without_faq: seoWithoutFaq.length,
        property_pages_without_faq: pages?.length ?? 0,
        faq_generated: generated,
        pages_updated: seoWithoutFaq.slice(0, 5).map((p: any) => p.slug),
      },
    };
  },

  // --- Schema Markup Generator ---
  "micro-schema-markup": async (supabase, _task) => {
    const { data: pages } = await supabase
      .from("seo_property_type_pages")
      .select("id, slug, h1, meta_title, meta_description")
      .is("schema_json", null)
      .eq("is_published", true)
      .limit(5);

    if (!pages || pages.length === 0) {
      return { success: true, summary: "Toutes les pages ont un schema markup." };
    }

    let updated = 0;
    for (const p of pages) {
      const schema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": p.meta_title || p.h1 || p.slug?.replace(/-/g, " "),
        "description": p.meta_description || "",
        "publisher": { "@type": "Organization", "name": "UNPRO" },
      };
      await supabase.from("seo_property_type_pages").update({ schema_json: schema }).eq("id", p.id);
      updated++;
    }

    return {
      success: true,
      summary: `${updated} pages enrichies avec schema markup.`,
      details: { updated },
    };
  },

  // --- Growth / CTA optimizer ---
  "exec-growth": async (supabase, _task) => {
    // Analyze SEO pages with weak/missing CTAs
    const { data: seoPages } = await supabase
      .from("seo_pages")
      .select("id, slug, title, content_data, is_published")
      .limit(30);

    if (!seoPages || seoPages.length === 0) {
      return { success: true, summary: "Aucune page SEO à analyser pour CTA." };
    }

    const weakCta: any[] = [];
    for (const p of seoPages) {
      const cd = p.content_data;
      const hasCta = cd?.sections?.some((s: any) => s.type === "cta" && s.strength === "strong");
      if (!hasCta) {
        weakCta.push({ slug: p.slug, title: p.title, published: p.is_published });
      }
    }

    // Count conversion metrics
    const { count: totalUsers } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    const { count: totalAppts } = await supabase.from("appointments").select("id", { count: "exact", head: true });
    const convRate = (totalUsers ?? 0) > 0 ? ((totalAppts ?? 0) / (totalUsers ?? 1)) * 100 : 0;

    return {
      success: true,
      summary: `${weakCta.length} pages avec CTA faible/absent. Taux conversion: ${convRate.toFixed(1)}%.`,
      details: {
        weak_cta_pages: weakCta.slice(0, 10),
        total_pages_analyzed: seoPages.length,
        conversion_rate: convRate.toFixed(1),
        total_users: totalUsers ?? 0,
        total_appointments: totalAppts ?? 0,
        recommendations: [
          weakCta.length > 5 ? "Ajouter CTAs contextuels sur toutes les pages service/ville" : null,
          convRate < 5 ? "Optimiser le funnel: simplifier la prise de rendez-vous" : null,
          "A/B tester les variantes de CTA (urgent vs informatif)",
        ].filter(Boolean),
      },
    };
  },
};

const DEFAULT_HANDLER: TaskHandler = async (_supabase, task) => {
  return {
    success: true,
    summary: `Tâche "${task.task_title}" marquée comme exécutée (handler par défaut — action manuelle requise).`,
    details: { needs_manual_action: true },
  };
};

// ===== ANALYSIS FUNCTIONS =====
function analyzeGrowth(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.totalUsers > 0 && ctx.totalContractors === 0) {
    proposals.push({
      agent_name: "AI Growth Director", agent_key: "exec-growth", agent_domain: "growth",
      task_title: "Aucun entrepreneur inscrit — lancer campagne d'acquisition",
      task_description: `${ctx.totalUsers} utilisateurs mais 0 entrepreneur.`,
      action_plan: ["Activer landing /professionals", "Créer 3 posts LinkedIn ciblés", "Email aux contacts fondateurs"],
      impact_score: 95, urgency: "critical", auto_executable: false, execution_mode: "manual",
    });
  }
  if (ctx.newUsers7d === 0 && ctx.totalUsers > 5) {
    proposals.push({
      agent_name: "AI Growth Director", agent_key: "exec-growth", agent_domain: "growth",
      task_title: "Stagnation — aucun nouvel utilisateur en 7 jours",
      task_description: "Croissance plate. Besoin de relancer l'acquisition.",
      action_plan: ["Analyser canaux", "Tester referral", "Optimiser SEO"],
      impact_score: 80, urgency: "high", auto_executable: false, execution_mode: "manual",
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
      action_plan: ["Notifier entrepreneurs", "Escalader > 48h", "Proposer alternatives"],
      impact_score: 90, urgency: "critical", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  if (ctx.pendingQuotes > 5) {
    proposals.push({
      agent_name: "Lead Qualification Agent", agent_key: "op-lead-qualifier", agent_domain: "leads",
      task_title: `${ctx.pendingQuotes} soumissions non analysées`,
      task_description: "Analyse IA en attente.",
      action_plan: ["Lancer analyse batch", "Notifier propriétaires"],
      impact_score: 85, urgency: "high", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  if (ctx.pendingAppointmentsOld > 0) {
    proposals.push({
      agent_name: "AI Lead Director", agent_key: "exec-leads", agent_domain: "leads",
      task_title: `${ctx.pendingAppointmentsOld} rendez-vous non répondus > 2h`,
      task_description: "RDV en attente trop longtemps. Risque de perte de leads qualifiés.",
      action_plan: ["Escalader immédiatement", "Notifier admin", "Proposer re-routing"],
      impact_score: 92, urgency: "critical", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  return proposals;
}

function analyzeSEO(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.territoriesWithoutSeo > 0) {
    proposals.push({
      agent_name: "SEO Page Generator", agent_key: "op-seo-page-gen", agent_domain: "seo",
      task_title: `${ctx.territoriesWithoutSeo} territoires sans contenu SEO`,
      task_description: "Territoires actifs sans pages SEO. Trafic organique perdu.",
      action_plan: ["Générer pages service/ville", "Créer contenu", "Soumettre sitemap"],
      impact_score: 78, urgency: "high", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  if (ctx.seoPagesMissingFaq > 0) {
    proposals.push({
      agent_name: "FAQ Generator Agent", agent_key: "micro-faq-generator", agent_domain: "seo",
      task_title: `${ctx.seoPagesMissingFaq} pages SEO publiées sans FAQ`,
      task_description: "Pages publiées sans FAQ = perte de rich snippets Google.",
      action_plan: ["Générer FAQs par page", "Ajouter schema markup FAQ", "Valider qualité"],
      impact_score: 72, urgency: "medium", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  if (ctx.ragDocuments < 20) {
    proposals.push({
      agent_name: "Content Writer Agent", agent_key: "op-content-writer", agent_domain: "seo",
      task_title: "Base de connaissances RAG insuffisante",
      task_description: `${ctx.ragDocuments} documents. Alex manque de contexte.`,
      action_plan: ["Ingérer FAQ manquantes", "Créer guides travaux", "Indexer coûts"],
      impact_score: 65, urgency: "medium", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  if (ctx.totalSeoPages < 10) {
    proposals.push({
      agent_name: "AI SEO Director", agent_key: "exec-seo", agent_domain: "seo",
      task_title: "Couverture SEO insuffisante",
      task_description: `Seulement ${ctx.totalSeoPages} pages SEO.`,
      action_plan: ["Identifier top 20 keywords", "Générer pages prioritaires", "Optimiser maillage"],
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
      action_plan: ["Contacter entrepreneurs", "Offrir essai Founder", "Activer Stripe"],
      impact_score: 95, urgency: "critical", auto_executable: false, execution_mode: "manual",
    });
  }
  return proposals;
}

function analyzeOperations(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.unverifiedContractors > 0) {
    proposals.push({
      agent_name: "AI Operations Director", agent_key: "exec-operations", agent_domain: "operations",
      task_title: `${ctx.unverifiedContractors} entrepreneurs non vérifiés`,
      task_description: "Profils en attente de vérification.",
      action_plan: ["Examiner profils", "Vérifier licence/assurance", "Approuver ou demander infos"],
      impact_score: 80, urgency: "high", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  if (ctx.incompleteContractors > 0) {
    proposals.push({
      agent_name: "AI Operations Director", agent_key: "exec-operations", agent_domain: "operations",
      task_title: `${ctx.incompleteContractors} profils entrepreneurs incomplets`,
      task_description: "Des profils ont trop de champs manquants pour être visibles.",
      action_plan: ["Identifier champs manquants", "Envoyer relance", "Proposer assistance"],
      impact_score: 70, urgency: "medium", auto_executable: true, execution_mode: "semi_auto",
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
      action_plan: ["Traiter file", "Scorer qualité", "Approuver si score > 8"],
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
      task_description: "Les utilisateurs n'utilisent pas le Quote Analyzer.",
      action_plan: ["Analyser funnel", "Simplifier formulaire", "Ajouter guide"],
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
      task_description: "Base suffisante pour analyses régulières.",
      action_plan: ["Agréger métriques", "Détecter anomalies", "Recommandations"],
      impact_score: 55, urgency: "low", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  return proposals;
}

function analyzeProperty(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.propertiesWithLowPassport > 0) {
    proposals.push({
      agent_name: "Passport Completion Agent", agent_key: "op-passport-completion", agent_domain: "property",
      task_title: `${ctx.propertiesWithLowPassport} propriétés avec passeport incomplet`,
      task_description: "Propriétés avec score < 30%. Relance recommandée.",
      action_plan: ["Identifier propriétés", "Envoyer notification", "Proposer prochaine action"],
      impact_score: 75, urgency: "medium", auto_executable: true, execution_mode: "semi_auto",
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
      task_description: "Suffisamment de données pour insights de quartier.",
      action_plan: ["Agréger par quartier", "Calculer tendances", "Publier insights"],
      impact_score: 55, urgency: "low", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  return proposals;
}

function analyzeMessaging(ctx: SystemContext): AgentProposal[] {
  const proposals: AgentProposal[] = [];
  if (ctx.totalUsers > 5) {
    proposals.push({
      agent_name: "Homeowner Message Orchestrator", agent_key: "op-messaging-orchestrator", agent_domain: "engagement",
      task_title: "Orchestrer séquences de messages propriétaires",
      task_description: "Base suffisante pour activer séquences d'engagement.",
      action_plan: ["Segmenter par activité", "Envoyer rappel J+3", "Proposer score J+7"],
      impact_score: 65, urgency: "medium", auto_executable: true, execution_mode: "semi_auto",
    });
  }
  return proposals;
}

const ANALYZERS = [
  analyzeGrowth, analyzeLeads, analyzeSEO, analyzeRevenue,
  analyzeOperations, analyzeMedia, analyzeProduct, analyzeData,
  analyzeProperty, analyzeNeighborhood, analyzeMessaging,
];

// ===== EXECUTE =====
async function executeTask(supabase: any, task: any): Promise<ExecutionResult> {
  const handler = TASK_HANDLERS[task.agent_key] || DEFAULT_HANDLER;
  return handler(supabase, task);
}

async function executeAutoTasks(supabase: any): Promise<{ executed: number; succeeded: number; failed: number; results: any[] }> {
  const { data: tasks } = await supabase
    .from("agent_tasks")
    .select("*")
    .in("status", ["approved", "proposed"])
    .order("impact_score", { ascending: false })
    .limit(20);

  if (!tasks || tasks.length === 0) {
    return { executed: 0, succeeded: 0, failed: 0, results: [] };
  }

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
      await supabase.from("agent_tasks").update({ status: "executing" }).eq("id", task.id);
      const result = await executeTask(supabase, task);
      executed++;

      const newStatus = result.success ? "completed" : "failed";
      await supabase.from("agent_tasks").update({
        status: newStatus,
        executed_at: new Date().toISOString(),
        execution_result: result,
      }).eq("id", task.id);

      if (result.success) succeeded++;
      else failed++;

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
        status: "failed", executed_at: new Date().toISOString(),
        execution_result: { success: false, summary: String(err) },
      }).eq("id", task.id);

      await supabase.from("agent_logs").insert({
        task_id: task.id, agent_name: task.agent_name,
        log_type: "execution_error", message: `Erreur: ${String(err)}`,
      });
    }
  }

  return { executed, succeeded, failed, results };
}

// ===== GATHER EXTENDED CONTEXT =====
async function gatherExtendedContext(supabase: any, ctx: SystemContext): Promise<SystemContext> {
  // Count SEO pages missing FAQ
  const { data: seoPages } = await supabase
    .from("seo_pages")
    .select("id, content_data")
    .eq("is_published", true)
    .limit(100);
  
  const missingFaq = (seoPages ?? []).filter((p: any) => {
    const cd = p.content_data;
    return !cd || !cd.faq || (Array.isArray(cd.faq) && cd.faq.length === 0);
  }).length;
  
  // Count incomplete contractors
  const { data: contractors } = await supabase
    .from("contractors")
    .select("id, description, specialty, city, phone, license_number, years_experience, logo_url")
    .limit(100);
  
  let incomplete = 0;
  for (const c of (contractors ?? [])) {
    let missing = 0;
    if (!c.description || c.description.length < 20) missing++;
    if (!c.specialty) missing++;
    if (!c.city) missing++;
    if (!c.phone) missing++;
    if (!c.license_number) missing++;
    if (!c.years_experience) missing++;
    if (!c.logo_url) missing++;
    if (missing >= 3) incomplete++;
  }

  // Count old pending appointments
  const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
  const { count: oldPending } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("status", "requested")
    .lt("created_at", twoHoursAgo);

  // Count territories without matching seo_pages
  const { data: territories } = await supabase
    .from("territories")
    .select("city_slug, category_slug")
    .eq("is_active", true)
    .limit(100);
  
  let terrWithoutSeo = 0;
  for (const t of (territories ?? [])) {
    const slug = `${t.category_slug}-${t.city_slug}`;
    const { count } = await supabase
      .from("seo_pages")
      .select("id", { count: "exact", head: true })
      .eq("slug", slug);
    if ((count ?? 0) === 0) terrWithoutSeo++;
  }

  return {
    ...ctx,
    seoPagesMissingFaq: missingFaq,
    seoPagesTotal: seoPages?.length ?? 0,
    incompleteContractors: incomplete,
    pendingAppointmentsOld: oldPending ?? 0,
    territoriesWithoutSeo: terrWithoutSeo,
  };
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
        tasks: tasks.data ?? [], logs: logs.data ?? [],
        metrics: metrics.data ?? [], agents: agents.data ?? [],
        memory: memory.data ?? [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        supabase.from("properties").select("id", { count: "exact", head: true }).lte("estimated_score", 30),
        supabase.from("properties").select("id", { count: "exact", head: true }).gt("estimated_score", 0),
        supabase.from("properties").select("city").not("city", "is", null),
        supabase.from("blog_articles").select("id", { count: "exact", head: true }),
        supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
      ]);

      const uniqueCities = new Set((citiesRes.data ?? []).map((r: any) => r.city));

      let ctx: SystemContext = {
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
        emptyTerritories: 0,
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
        seoPagesMissingFaq: 0,
        seoPagesTotal: 0,
        incompleteContractors: 0,
        pendingAppointmentsOld: 0,
        territoriesWithoutSeo: 0,
      };

      // Gather extended context
      ctx = await gatherExtendedContext(supabase, ctx);

      // Run all analyzers
      const allProposals: AgentProposal[] = [];
      for (const analyzer of ANALYZERS) {
        try { allProposals.push(...analyzer(ctx)); } catch (e) { console.error("Analyzer error:", e); }
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
            agent_name: p.agent_name, agent_domain: p.agent_domain, agent_key: p.agent_key,
            task_title: p.task_title, task_description: p.task_description,
            action_plan: p.action_plan, impact_score: p.impact_score,
            urgency: p.urgency, auto_executable: p.auto_executable,
            execution_mode: p.execution_mode, status: "proposed",
          });
          storedCount++;
        }
      }

      // Store metrics
      const metricsToStore = [
        { metric_name: "total_users", metric_value: ctx.totalUsers, metric_category: "users" },
        { metric_name: "total_contractors", metric_value: ctx.totalContractors, metric_category: "contractors" },
        { metric_name: "unverified_contractors", metric_value: ctx.unverifiedContractors, metric_category: "contractors" },
        { metric_name: "incomplete_contractors", metric_value: ctx.incompleteContractors, metric_category: "contractors" },
        { metric_name: "pending_appointments", metric_value: ctx.pendingAppointments, metric_category: "appointments" },
        { metric_name: "old_pending_appointments", metric_value: ctx.pendingAppointmentsOld, metric_category: "appointments" },
        { metric_name: "active_subscriptions", metric_value: ctx.activeSubscriptions, metric_category: "revenue" },
        { metric_name: "total_seo_pages", metric_value: ctx.totalSeoPages, metric_category: "seo" },
        { metric_name: "seo_pages_missing_faq", metric_value: ctx.seoPagesMissingFaq, metric_category: "seo" },
        { metric_name: "territories_without_seo", metric_value: ctx.territoriesWithoutSeo, metric_category: "seo" },
        { metric_name: "total_territories", metric_value: ctx.totalTerritories, metric_category: "territories" },
        { metric_name: "total_agents", metric_value: ctx.totalAgents, metric_category: "system" },
      ];
      await supabase.from("agent_metrics").insert(metricsToStore);

      await supabase.from("agent_logs").insert({
        agent_name: "chief-orchestrator", log_type: "analysis",
        message: `Analyse complète: ${allProposals.length} propositions, ${storedCount} nouvelles. ${ctx.activeAgents} agents actifs.`,
        metadata: { context: ctx, proposals_count: allProposals.length, stored: storedCount },
      });

      await supabase.from("agent_memory").insert({
        memory_key: `analysis_${Date.now()}`, memory_type: "insight", domain: "system",
        content: `Analyse: ${ctx.totalUsers} users, ${ctx.totalContractors} contractors (${ctx.unverifiedContractors} non-vérifiés, ${ctx.incompleteContractors} incomplets), ${ctx.totalSeoPages} SEO pages (${ctx.seoPagesMissingFaq} sans FAQ), ${ctx.pendingAppointments} RDV pending (${ctx.pendingAppointmentsOld} > 2h), ${ctx.totalTerritories} territoires (${ctx.territoriesWithoutSeo} sans SEO).`,
        agent_key: "chief-orchestrator", importance: 7,
      });

      // Auto-execute
      const execResult = await executeAutoTasks(supabase);

      return new Response(JSON.stringify({
        context: ctx, proposals: allProposals, stored: storedCount,
        agents_active: ctx.activeAgents, execution: execResult,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== ACTION: EXECUTE =====
    if (action === "execute") {
      const { task_id } = body;

      if (task_id) {
        const { data: task } = await supabase.from("agent_tasks").select("*").eq("id", task_id).single();
        if (!task) throw new Error("Tâche introuvable");

        await supabase.from("agent_tasks").update({ status: "executing" }).eq("id", task_id);
        const result = await executeTask(supabase, task);

        await supabase.from("agent_tasks").update({
          status: result.success ? "completed" : "failed",
          executed_at: new Date().toISOString(),
          execution_result: result,
        }).eq("id", task_id);

        if (task.agent_key) {
          const { data: agent } = await supabase.from("agent_registry").select("tasks_executed, tasks_succeeded").eq("agent_key", task.agent_key).maybeSingle();
          if (agent) {
            const ne = (agent.tasks_executed ?? 0) + 1;
            const ns = (agent.tasks_succeeded ?? 0) + (result.success ? 1 : 0);
            await supabase.from("agent_registry").update({
              tasks_executed: ne, tasks_succeeded: ns, success_rate: ne > 0 ? (ns / ne) * 100 : 0,
            }).eq("agent_key", task.agent_key);
          }
        }

        await supabase.from("agent_logs").insert({
          task_id, agent_name: task.agent_name,
          log_type: result.success ? "execution_success" : "execution_failure",
          message: result.summary, metadata: result.details ?? {},
        });

        return new Response(JSON.stringify({ success: true, result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const execResult = await executeAutoTasks(supabase);
      return new Response(JSON.stringify({ success: true, ...execResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: APPROVE =====
    if (action === "approve") {
      const { task_id, reviewer_id } = body;
      await supabase.from("agent_tasks").update({
        status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: reviewer_id,
      }).eq("id", task_id);

      await supabase.from("agent_logs").insert({
        task_id, agent_name: "chief-orchestrator", log_type: "approval", message: `Tâche approuvée par admin.`,
      });

      const { data: task } = await supabase.from("agent_tasks").select("*").eq("id", task_id).single();
      let executionResult = null;
      if (task?.auto_executable) {
        await supabase.from("agent_tasks").update({ status: "executing" }).eq("id", task_id);
        const result = await executeTask(supabase, task);
        executionResult = result;

        await supabase.from("agent_tasks").update({
          status: result.success ? "completed" : "failed",
          executed_at: new Date().toISOString(), execution_result: result,
        }).eq("id", task_id);

        if (task.agent_key) {
          const { data: agent } = await supabase.from("agent_registry").select("tasks_executed, tasks_succeeded").eq("agent_key", task.agent_key).maybeSingle();
          if (agent) {
            const ne = (agent.tasks_executed ?? 0) + 1;
            const ns = (agent.tasks_succeeded ?? 0) + (result.success ? 1 : 0);
            await supabase.from("agent_registry").update({
              tasks_executed: ne, tasks_succeeded: ns, success_rate: ne > 0 ? (ns / ne) * 100 : 0,
            }).eq("agent_key", task.agent_key);
          }
        }

        await supabase.from("agent_logs").insert({
          task_id, agent_name: task.agent_name,
          log_type: result.success ? "execution_success" : "execution_failure",
          message: result.summary, metadata: result.details ?? {},
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
        status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: reviewer_id,
      }).eq("id", task_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: CREATE_AGENT =====
    if (action === "create_agent") {
      const { agent_key, agent_name, layer, domain, parent_agent_key, mission, autonomy_level } = body;
      const { error } = await supabase.from("agent_registry").insert({
        agent_key, agent_name, layer, domain, parent_agent_key, mission,
        autonomy_level: autonomy_level || "propose", created_by: "orchestrator", status: "active",
      });
      if (error) throw error;

      await supabase.from("agent_logs").insert({
        agent_name: "chief-orchestrator", log_type: "agent_creation",
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
        agent_name: "chief-orchestrator", log_type: "agent_status", message: `Agent ${key} → ${new_status}`,
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: CRON =====
    if (action === "cron") {
      const analyzeResp = await fetch(`${supabaseUrl}/functions/v1/agent-orchestrator`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({ action: "analyze" }),
      });
      const analyzeData = await analyzeResp.json();
      return new Response(JSON.stringify({
        success: true, cron_run: true,
        analysis: { proposals: analyzeData.proposals?.length ?? 0, stored: analyzeData.stored ?? 0, execution: analyzeData.execution ?? null },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== ACTION: SEED_DATASET =====
    if (action === "seed_dataset") {
      const batchId = makeBatchId();
      const report: Record<string, any> = { batch_id: batchId };
      const existingProfileId = body.profile_user_id || null;

      // Get existing user_id for FK constraints
      const { data: existingProfile } = await supabase.from("profiles").select("user_id").limit(1).maybeSingle();
      const userId = existingProfile?.user_id;
      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: "No existing user found. Need at least one user." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. CITIES (15 cities)
      const cities = [
        { name: "Montréal", slug: "montreal", province: "QC", province_slug: "qc", latitude: 45.5017, longitude: -73.5673, population: 1780000, is_active: true },
        { name: "Laval", slug: "laval", province: "QC", province_slug: "qc", latitude: 45.6066, longitude: -73.7124, population: 438000, is_active: true },
        { name: "Longueuil", slug: "longueuil", province: "QC", province_slug: "qc", latitude: 45.5312, longitude: -73.5185, population: 250000, is_active: true },
        { name: "Terrebonne", slug: "terrebonne", province: "QC", province_slug: "qc", latitude: 45.6963, longitude: -73.6328, population: 119000, is_active: true },
        { name: "Repentigny", slug: "repentigny", province: "QC", province_slug: "qc", latitude: 45.7422, longitude: -73.4604, population: 86000, is_active: true },
        { name: "Brossard", slug: "brossard", province: "QC", province_slug: "qc", latitude: 45.4432, longitude: -73.4570, population: 89000, is_active: true },
        { name: "Saint-Jean-sur-Richelieu", slug: "saint-jean-sur-richelieu", province: "QC", province_slug: "qc", latitude: 45.3071, longitude: -73.2628, population: 100000, is_active: true },
        { name: "Blainville", slug: "blainville", province: "QC", province_slug: "qc", latitude: 45.6645, longitude: -73.8783, population: 61000, is_active: true },
        { name: "Mirabel", slug: "mirabel", province: "QC", province_slug: "qc", latitude: 45.6502, longitude: -74.0831, population: 62000, is_active: true },
        { name: "Drummondville", slug: "drummondville", province: "QC", province_slug: "qc", latitude: 45.8838, longitude: -72.4843, population: 79000, is_active: true },
        { name: "Sherbrooke", slug: "sherbrooke", province: "QC", province_slug: "qc", latitude: 45.4042, longitude: -71.8929, population: 170000, is_active: true },
        { name: "Trois-Rivières", slug: "trois-rivieres", province: "QC", province_slug: "qc", latitude: 46.3432, longitude: -72.5419, population: 140000, is_active: true },
        { name: "Québec", slug: "quebec", province: "QC", province_slug: "qc", latitude: 46.8139, longitude: -71.2080, population: 550000, is_active: true },
        { name: "Lévis", slug: "levis", province: "QC", province_slug: "qc", latitude: 46.8032, longitude: -71.1780, population: 149000, is_active: true },
        { name: "Saint-Hyacinthe", slug: "saint-hyacinthe", province: "QC", province_slug: "qc", latitude: 45.6275, longitude: -72.9569, population: 57000, is_active: true },
      ];

      // Upsert cities
      let citiesCreated = 0;
      const cityIds: Record<string, string> = {};
      for (const c of cities) {
        const { data: existing } = await supabase.from("cities").select("id").eq("slug", c.slug).maybeSingle();
        if (existing) {
          cityIds[c.slug] = existing.id;
        } else {
          const { data: inserted } = await supabase.from("cities").insert(c).select("id").single();
          if (inserted) {
            cityIds[c.slug] = inserted.id;
            citiesCreated++;
          }
        }
      }
      report.cities = { created: citiesCreated, total: Object.keys(cityIds).length };

      // 2. TERRITORIES (city × category combos)
      const categoryMap: Record<string, string> = {};
      const { data: cats } = await supabase.from("service_categories").select("id, slug").eq("is_active", true).limit(20);
      for (const c of (cats ?? [])) categoryMap[c.slug] = c.id;

      const targetCategories = ["toiture", "isolation", "drainage", "fondation", "fenestration", "cvc-chauffage", "calfeutrage", "renovation-generale", "plomberie", "electricite"];
      const targetCities = ["laval", "longueuil", "terrebonne", "brossard", "blainville", "mirabel", "quebec", "levis", "sherbrooke", "drummondville", "repentigny", "saint-hyacinthe", "montreal", "trois-rivieres"];

      let territoriesCreated = 0;
      for (const citySlug of targetCities.slice(0, 10)) {
        for (const catSlug of targetCategories.slice(0, 6)) {
          if (!categoryMap[catSlug]) continue;
          const catName = (cats ?? []).find((c: any) => c.slug === catSlug)?.slug || catSlug;
          const cityName = cities.find(c => c.slug === citySlug)?.name || citySlug;
          
          const { data: existing } = await supabase.from("territories")
            .select("id").eq("city_slug", citySlug).eq("category_slug", catSlug).maybeSingle();
          
          if (!existing) {
            await supabase.from("territories").insert({
              city_slug: citySlug, category_slug: catSlug,
              city_name: cityName, category_name: catName,
              max_contractors: 10, signature_slots: 1, elite_slots: 2, premium_slots: 3,
              is_active: true,
            });
            territoriesCreated++;
          }
        }
      }
      report.territories = { created: territoriesCreated };

      // 3. SEO PAGES (published, some with FAQ, some without — for handlers to detect)
      const seoPageData = [
        { slug: "isolation-montreal", title: "Isolation à Montréal", published: true, hasFaq: false },
        { slug: "toiture-laval", title: "Toiture à Laval", published: true, hasFaq: false },
        { slug: "drainage-longueuil", title: "Drainage à Longueuil", published: true, hasFaq: false },
        { slug: "fenestration-brossard", title: "Fenestration à Brossard", published: true, hasFaq: false },
        { slug: "cvc-chauffage-blainville", title: "CVC / Chauffage à Blainville", published: true, hasFaq: false },
        { slug: "renovation-generale-mirabel", title: "Rénovation générale à Mirabel", published: true, hasFaq: false },
        { slug: "fondation-sherbrooke", title: "Fondation à Sherbrooke", published: true, hasFaq: false },
        { slug: "calfeutrage-quebec", title: "Calfeutrage à Québec", published: true, hasFaq: false },
        { slug: "plomberie-drummondville", title: "Plomberie à Drummondville", published: true, hasFaq: true },
        { slug: "electricite-levis", title: "Électricité à Lévis", published: true, hasFaq: true },
        // Pages with weak CTA
        { slug: "isolation-repentigny", title: "Isolation à Repentigny", published: true, hasFaq: false, weakCta: true },
        { slug: "toiture-saint-hyacinthe", title: "Toiture à Saint-Hyacinthe", published: true, hasFaq: false, weakCta: true },
      ];

      let seoCreated = 0;
      for (const sp of seoPageData) {
        const { data: existing } = await supabase.from("seo_pages").select("id").eq("slug", sp.slug).maybeSingle();
        if (!existing) {
          const contentData: any = {
            sandbox_batch_id: batchId,
            generated_by: "sandbox",
            sections: [
              { type: "hero", h1: sp.title },
              { type: "intro", text: `Trouvez les meilleurs professionnels pour ${sp.title.toLowerCase()}.` },
            ],
          };
          if (sp.hasFaq) {
            contentData.faq = [
              { q: "Quel est le coût moyen?", a: "Le coût varie selon le projet." },
              { q: "Comment choisir un pro?", a: "Vérifiez licences et assurances." },
            ];
          }
          if (!sp.weakCta) {
            contentData.sections.push({ type: "cta", text: "Comparez les pros vérifiés", strength: "strong" });
          } else {
            contentData.sections.push({ type: "cta", text: "En savoir plus", strength: "weak" });
          }
          
          await supabase.from("seo_pages").insert({
            slug: sp.slug, title: sp.title, page_type: "service_city",
            is_published: sp.published,
            meta_description: `${sp.title} — Comparez les professionnels vérifiés UNPRO.`,
            content_data: contentData,
          });
          seoCreated++;
        }
      }
      report.seo_pages = { created: seoCreated, with_faq: 2, without_faq: seoCreated - 2 };

      // 4. CONTRACTORS (10 incomplete profiles)
      const contractorData = [
        // Group A: Very incomplete
        { business_name: `${SANDBOX_PREFIX} Isolation Pro Nord`, specialty: null, description: null, city: null, phone: null, license_number: null, years_experience: null, logo_url: null, verification_status: "pending" },
        { business_name: `${SANDBOX_PREFIX} Toitures Signature RN`, specialty: "toiture", description: null, city: "Laval", phone: null, license_number: null, years_experience: null, logo_url: null, verification_status: "pending" },
        { business_name: `${SANDBOX_PREFIX} Drain Expert Long.`, specialty: null, description: "Expert en drainage", city: null, phone: null, license_number: null, years_experience: null, logo_url: null, verification_status: "submitted" },
        { business_name: `${SANDBOX_PREFIX} Fenêtres Vision Plus`, specialty: null, description: null, city: "Brossard", phone: "514-555-0001", license_number: null, years_experience: null, logo_url: null, verification_status: "pending" },
        { business_name: `${SANDBOX_PREFIX} ThermoClimat Laval`, specialty: null, description: null, city: null, phone: null, license_number: null, years_experience: null, logo_url: null, verification_status: "pending" },
        // Group B: Partially incomplete
        { business_name: `${SANDBOX_PREFIX} Cuisine Nova`, specialty: "rénovation cuisine", description: "Spécialiste en rénovation de cuisines modernes depuis 2015", city: "Montréal", phone: "514-555-0002", license_number: "RBQ-1234", years_experience: 9, logo_url: null, verification_status: "submitted" },
        { business_name: `${SANDBOX_PREFIX} Fondation Expert Estrie`, specialty: "fondation", description: "Réparations de fondations résidentielles et commerciales", city: "Sherbrooke", phone: "819-555-0003", license_number: null, years_experience: 15, logo_url: null, verification_status: "pending" },
        { business_name: `${SANDBOX_PREFIX} Inspection Alpha QC`, specialty: "inspection", description: "Inspections pré-achat et préventives", city: "Québec", phone: "418-555-0004", license_number: "RBQ-5678", years_experience: 12, logo_url: null, verification_status: "submitted" },
        { business_name: `${SANDBOX_PREFIX} Calfeutrage Précision`, specialty: "calfeutrage", description: null, city: "Terrebonne", phone: "450-555-0005", license_number: null, years_experience: 7, logo_url: null, verification_status: "pending" },
        { business_name: `${SANDBOX_PREFIX} Réno Horizon`, specialty: "rénovation générale", description: "Rénovations complètes clé en main", city: "Repentigny", phone: "450-555-0006", license_number: "RBQ-9012", years_experience: 20, logo_url: null, verification_status: "submitted" },
      ];

      let contractorsCreated = 0;
      const contractorIds: string[] = [];
      for (const c of contractorData) {
        const { data: existing } = await supabase.from("contractors").select("id").eq("business_name", c.business_name).maybeSingle();
        if (!existing) {
          const { data: inserted } = await supabase.from("contractors").insert({
            ...c,
            user_id: userId,
            slug: c.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(`${SANDBOX_PREFIX.toLowerCase()}-`, "sandbox-"),
            email: `test-${contractorsCreated}@sandbox.unpro.ca`,
            admin_note: `sandbox_batch_id:${batchId}`,
          }).select("id").single();
          if (inserted) {
            contractorIds.push(inserted.id);
            contractorsCreated++;
          }
        } else {
          contractorIds.push(existing.id);
        }
      }
      report.contractors = { created: contractorsCreated, total: contractorIds.length };

      // 5. PROPERTIES (6 test properties)
      const propertyData = [
        { address: `${SANDBOX_PREFIX} 123 rue du Test`, city: "Laval", province: "QC", property_type: "bungalow", year_built: 1972, estimated_score: 15 },
        { address: `${SANDBOX_PREFIX} 456 boul. Sandbox`, city: "Longueuil", province: "QC", property_type: "duplex", year_built: 1958, estimated_score: 22 },
        { address: `${SANDBOX_PREFIX} 789 av. Autonome`, city: "Brossard", province: "QC", property_type: "cottage", year_built: 2004, estimated_score: 45 },
        { address: `${SANDBOX_PREFIX} 321 ch. des Agents`, city: "Montréal", province: "QC", property_type: "condo", year_built: 2010, estimated_score: 28 },
        { address: `${SANDBOX_PREFIX} 654 rue Intelligence`, city: "Sherbrooke", province: "QC", property_type: "unifamiliale", year_built: 1988, estimated_score: 18 },
        { address: `${SANDBOX_PREFIX} 987 boul. Réseau`, city: "Québec", province: "QC", property_type: "triplex", year_built: 1965, estimated_score: 12 },
      ];

      let propertiesCreated = 0;
      for (const p of propertyData) {
        const { data: existing } = await supabase.from("properties").select("id").eq("address", p.address).maybeSingle();
        if (!existing) {
          await supabase.from("properties").insert({ ...p, user_id: userId });
          propertiesCreated++;
        }
      }
      report.properties = { created: propertiesCreated };

      // 6. APPOINTMENTS (leads - some old to trigger escalation)
      let appointmentsCreated = 0;
      if (contractorIds.length > 0) {
        const appointmentData = [
          { contractor_id: contractorIds[0], project_category: "isolation", urgency_level: "high", notes: `${SANDBOX_PREFIX} Isolation grenier urgente`, created_at: new Date(Date.now() - 48 * 3600000).toISOString() },
          { contractor_id: contractorIds[1 % contractorIds.length], project_category: "toiture", urgency_level: "critical", notes: `${SANDBOX_PREFIX} Fuite toiture active`, created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
          { contractor_id: contractorIds[2 % contractorIds.length], project_category: "drainage", urgency_level: "medium", notes: `${SANDBOX_PREFIX} Problème drain français`, created_at: new Date(Date.now() - 6 * 3600000).toISOString() },
          { contractor_id: contractorIds[3 % contractorIds.length], project_category: "fenestration", urgency_level: "medium", notes: `${SANDBOX_PREFIX} Remplacement fenêtres`, created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
          { contractor_id: contractorIds[4 % contractorIds.length], project_category: "cvc-chauffage", urgency_level: "high", notes: `${SANDBOX_PREFIX} Thermopompe en panne`, created_at: new Date(Date.now() - 1 * 3600000).toISOString() },
          { contractor_id: contractorIds[5 % contractorIds.length], project_category: "renovation-cuisine", urgency_level: "low", notes: `${SANDBOX_PREFIX} Projet réno cuisine`, created_at: new Date().toISOString() },
        ];

        for (const a of appointmentData) {
          await supabase.from("appointments").insert({
            ...a,
            homeowner_user_id: userId,
            status: "requested",
          });
          appointmentsCreated++;
        }
      }
      report.appointments = { created: appointmentsCreated };

      // 7. LOG
      await supabase.from("agent_logs").insert({
        agent_name: "chief-orchestrator", log_type: "sandbox_seed",
        message: `${SANDBOX_PREFIX} Dataset sandbox créé: batch ${batchId}`,
        metadata: { batch_id: batchId, report },
      });

      report.success = true;
      return new Response(JSON.stringify(report), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: SEED_TEST (legacy) =====
    if (action === "seed_test") {
      const results: Record<string, any> = {};
      await supabase.from("agent_tasks").delete().like("task_title", "%[TEST]%");

      const testTasks = [
        { agent_name: "SEO Page Generator", agent_key: "op-seo-page-gen", agent_domain: "seo", task_title: "[TEST] Générer pages SEO manquantes", task_description: "Test: créer pages SEO brouillon.", action_plan: ["Identifier territoires vides", "Créer pages brouillon"], impact_score: 70, urgency: "medium", auto_executable: true, execution_mode: "semi_auto", status: "proposed" },
        { agent_name: "FAQ Generator Agent", agent_key: "micro-faq-generator", agent_domain: "seo", task_title: "[TEST] Générer FAQs manquantes", task_description: "Test: identifier pages sans FAQ.", action_plan: ["Scanner pages", "Lister slugs"], impact_score: 65, urgency: "medium", auto_executable: true, execution_mode: "semi_auto", status: "proposed" },
        { agent_name: "AI Operations Director", agent_key: "exec-operations", agent_domain: "operations", task_title: "[TEST] Vérifier profils incomplets", task_description: "Test: notifications admin pour non-vérifiés.", action_plan: ["Lister non-vérifiés", "Créer notifications"], impact_score: 80, urgency: "high", auto_executable: true, execution_mode: "semi_auto", status: "approved" },
        { agent_name: "AI Lead Director", agent_key: "exec-leads", agent_domain: "leads", task_title: "[TEST] Escalader leads en attente", task_description: "Test: vérifier RDV > 24h.", action_plan: ["Scanner requested", "Escalader > 24h"], impact_score: 90, urgency: "critical", auto_executable: true, execution_mode: "semi_auto", status: "proposed" },
        { agent_name: "AI Growth Director", agent_key: "exec-growth", agent_domain: "growth", task_title: "[TEST] Analyser croissance et conversion", task_description: "Test: taux conversion et CTA.", action_plan: ["Calculer taux", "Proposer tests"], impact_score: 80, urgency: "high", auto_executable: false, execution_mode: "manual", status: "proposed" },
      ];

      const { data: insertedTasks, error: taskErr } = await supabase.from("agent_tasks").insert(testTasks).select("id, task_title, status, agent_key");
      results.tasks_created = insertedTasks ?? [];
      results.tasks_error = taskErr?.message ?? null;

      await supabase.from("agent_logs").insert({
        agent_name: "chief-orchestrator", log_type: "test_seed",
        message: `[TEST] Données de test créées: ${testTasks.length} tâches.`,
        metadata: { test: true, count: testTasks.length },
      });
      results.log_created = true;

      return new Response(JSON.stringify({ success: true, ...results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: CLEANUP_DATASET =====
    if (action === "cleanup_dataset") {
      const cleanup: Record<string, number> = {};

      // Appointments with sandbox prefix
      const { count: apptDel } = await supabase.from("appointments").delete().like("notes", `%${SANDBOX_PREFIX}%`).select("id", { count: "exact", head: true });
      cleanup.appointments = apptDel ?? 0;

      // Contractors with sandbox prefix
      const { count: contrDel } = await supabase.from("contractors").delete().like("business_name", `%${SANDBOX_PREFIX}%`).select("id", { count: "exact", head: true });
      cleanup.contractors = contrDel ?? 0;

      // Properties with sandbox prefix
      const { count: propDel } = await supabase.from("properties").delete().like("address", `%${SANDBOX_PREFIX}%`).select("id", { count: "exact", head: true });
      cleanup.properties = propDel ?? 0;

      // SEO pages created by sandbox
      const { data: sandboxSeoPages } = await supabase.from("seo_pages").select("id, content_data").limit(200);
      const sandboxSeoIds = (sandboxSeoPages ?? []).filter((p: any) => p.content_data?.sandbox_batch_id || p.content_data?.generated_by === "sandbox" || p.content_data?.generated_by === "op-seo-page-gen").map((p: any) => p.id);
      if (sandboxSeoIds.length > 0) {
        await supabase.from("seo_pages").delete().in("id", sandboxSeoIds);
      }
      cleanup.seo_pages = sandboxSeoIds.length;

      // Agent tasks with sandbox prefix or [TEST]
      const { count: taskDel1 } = await supabase.from("agent_tasks").delete().like("task_title", `%${SANDBOX_PREFIX}%`).select("id", { count: "exact", head: true });
      const { count: taskDel2 } = await supabase.from("agent_tasks").delete().like("task_title", "%[TEST]%").select("id", { count: "exact", head: true });
      cleanup.agent_tasks = (taskDel1 ?? 0) + (taskDel2 ?? 0);

      // Logs
      const { count: logDel1 } = await supabase.from("agent_logs").delete().like("message", `%${SANDBOX_PREFIX}%`).select("id", { count: "exact", head: true });
      const { count: logDel2 } = await supabase.from("agent_logs").delete().like("message", "%[TEST]%").select("id", { count: "exact", head: true });
      cleanup.agent_logs = (logDel1 ?? 0) + (logDel2 ?? 0);

      // Admin notifications created by sandbox contractors
      const { count: notifDel } = await supabase.from("admin_notifications").delete().like("title", `%${SANDBOX_PREFIX}%`).select("id", { count: "exact", head: true });
      cleanup.admin_notifications = notifDel ?? 0;

      const totalDeleted = Object.values(cleanup).reduce((a, b) => a + b, 0);

      await supabase.from("agent_logs").insert({
        agent_name: "chief-orchestrator", log_type: "sandbox_cleanup",
        message: `Nettoyage sandbox: ${totalDeleted} éléments supprimés.`,
        metadata: cleanup,
      });

      return new Response(JSON.stringify({ success: true, total_deleted: totalDeleted, cleanup }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: CLEANUP_TEST (legacy) =====
    if (action === "cleanup_test") {
      const { count: tasksDeleted } = await supabase.from("agent_tasks").delete().like("task_title", "%[TEST]%").select("id", { count: "exact", head: true });
      const { count: logsDeleted } = await supabase.from("agent_logs").delete().like("message", "%[TEST]%").select("id", { count: "exact", head: true });
      return new Response(JSON.stringify({ success: true, tasks_deleted: tasksDeleted ?? 0, logs_deleted: logsDeleted ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: DEBUG =====
    if (action === "debug") {
      const [tasksRes, logsRes, metricsRes, agentsRes] = await Promise.all([
        supabase.from("agent_tasks").select("id, task_title, status, agent_key, agent_domain, urgency, impact_score, auto_executable, execution_mode, executed_at, execution_result, proposed_at").order("proposed_at", { ascending: false }).limit(50),
        supabase.from("agent_logs").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("agent_metrics").select("*").order("snapshot_at", { ascending: false }).limit(30),
        supabase.from("agent_registry").select("agent_key, agent_name, layer, domain, autonomy_level, status, tasks_executed, tasks_succeeded, success_rate").order("layer").limit(50),
      ]);

      const tasksByStatus: Record<string, number> = {};
      for (const t of (tasksRes.data ?? [])) tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;

      const handlersAvailable = Object.keys(TASK_HANDLERS);
      const agentKeys = (agentsRes.data ?? []).map((a: any) => a.agent_key);

      // Count sandbox data
      const { count: sandboxContractors } = await supabase.from("contractors").select("id", { count: "exact", head: true }).like("business_name", `%${SANDBOX_PREFIX}%`);
      const { count: sandboxProperties } = await supabase.from("properties").select("id", { count: "exact", head: true }).like("address", `%${SANDBOX_PREFIX}%`);
      const { count: sandboxAppts } = await supabase.from("appointments").select("id", { count: "exact", head: true }).like("notes", `%${SANDBOX_PREFIX}%`);
      const { count: totalTerritories } = await supabase.from("territories").select("id", { count: "exact", head: true }).eq("is_active", true);
      const { count: totalSeoPages } = await supabase.from("seo_pages").select("id", { count: "exact", head: true });
      const { count: publishedSeoPages } = await supabase.from("seo_pages").select("id", { count: "exact", head: true }).eq("is_published", true);

      return new Response(JSON.stringify({
        summary: {
          total_tasks: (tasksRes.data ?? []).length,
          tasks_by_status: tasksByStatus,
          total_logs: (logsRes.data ?? []).length,
          total_metrics_snapshots: (metricsRes.data ?? []).length,
          total_agents: (agentsRes.data ?? []).length,
          handlers_registered: handlersAvailable.length,
          agents_with_handlers: agentKeys.filter((k: string) => handlersAvailable.includes(k)).length,
          agents_without_handlers: agentKeys.filter((k: string) => !handlersAvailable.includes(k)).length,
        },
        sandbox_data: {
          contractors: sandboxContractors ?? 0,
          properties: sandboxProperties ?? 0,
          appointments: sandboxAppts ?? 0,
          territories: totalTerritories ?? 0,
          seo_pages_total: totalSeoPages ?? 0,
          seo_pages_published: publishedSeoPages ?? 0,
        },
        handlers: handlersAvailable,
        agents_missing_handlers: agentKeys.filter((k: string) => !handlersAvailable.includes(k)),
        tasks: tasksRes.data ?? [],
        recent_logs: (logsRes.data ?? []).slice(0, 20),
        agents: agentsRes.data ?? [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Orchestrator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
