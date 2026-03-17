import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { action, ...params } = await req.json();

    switch (action) {
      case "expand_content":
        return jsonRes(await expandContent(supabase, params));
      case "expand_cities":
        return jsonRes(await expandCities(supabase, params));
      case "discover_transformations":
        return jsonRes(await discoverTransformations(supabase));
      case "analyze_traffic":
        return jsonRes(await analyzeTraffic(supabase));
      case "promote_transformations":
        return jsonRes(await promoteTransformations(supabase));
      case "get_dashboard":
        return jsonRes(await getDashboard(supabase));
      case "get_flywheel_status":
        return jsonRes(await getFlywheelStatus(supabase));
      case "approve_event":
        return jsonRes(await approveEvent(supabase, params));
      case "reject_event":
        return jsonRes(await rejectEvent(supabase, params));
      default:
        return jsonRes({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    console.error("Growth engine error:", err);
    return jsonRes({ error: String(err) }, 500);
  }
});

// ─── Content Expansion ──────────────────────────────────────────
async function expandContent(supabase: any, params: any) {
  const limit = params.limit ?? 20;

  // Find problem × city combinations not yet covered
  const { data: problems } = await supabase
    .from("home_problems")
    .select("id, slug, name_fr")
    .eq("is_active", true)
    .limit(50);

  const { data: cities } = await supabase
    .from("cities")
    .select("id, slug, name")
    .eq("is_active", true)
    .limit(100);

  if (!problems?.length || !cities?.length) {
    return { status: "no_data", generated: 0 };
  }

  // Get existing coverage
  const { data: existing } = await supabase
    .from("home_problem_city_pages")
    .select("problem_id, city_id");

  const existingSet = new Set(
    (existing ?? []).map((e: any) => `${e.problem_id}:${e.city_id}`)
  );

  // Find gaps — prioritize cities where contractors exist
  const { data: contractorCities } = await supabase
    .from("contractor_service_areas")
    .select("city_id")
    .not("city_id", "is", null);

  const activeCityIds = new Set(
    (contractorCities ?? []).map((c: any) => c.city_id)
  );

  const gaps: Array<{ problem: any; city: any }> = [];
  for (const problem of problems) {
    for (const city of cities) {
      if (!existingSet.has(`${problem.id}:${city.id}`) && activeCityIds.has(city.id)) {
        gaps.push({ problem, city });
      }
    }
  }

  // Shuffle and take limit
  const selected = gaps.sort(() => Math.random() - 0.5).slice(0, limit);

  let generated = 0;
  for (const { problem, city } of selected) {
    // Count local contractors
    const { count: contractorCount } = await supabase
      .from("contractor_service_areas")
      .select("id", { count: "exact", head: true })
      .eq("city_id", city.id);

    // Generate page with AI content
    const aiContent = await generatePageContent(problem, city);

    const { error } = await supabase.from("home_problem_city_pages").insert({
      problem_id: problem.id,
      city_id: city.id,
      seo_title: `${problem.name_fr} à ${city.name} — UNPRO`,
      seo_description: `Trouvez des solutions pour ${problem.name_fr} à ${city.name}. Coûts estimés, entrepreneurs vérifiés et conseils d'experts.`,
      contractor_count: contractorCount ?? 0,
      faq: aiContent.faq,
      local_tips: aiContent.localTips,
      custom_content: aiContent.content,
      is_published: false, // Needs admin review (hybrid mode)
    });

    if (!error) {
      generated++;
      await supabase.from("growth_events").insert({
        event_type: "content_generated",
        source_engine: "content_expansion",
        entity_type: "problem_city_page",
        title: `${problem.name_fr} × ${city.name}`,
        description: `Page SEO générée pour ${problem.name_fr} à ${city.name}`,
        metadata: { problem_slug: problem.slug, city_slug: city.slug, contractor_count: contractorCount },
        status: "pending", // Awaits admin approval
      });
    }
  }

  // Snapshot metric
  await upsertMetric(supabase, "content_pages_generated", generated);

  return { status: "ok", gaps_found: gaps.length, generated };
}

// ─── City Expansion ─────────────────────────────────────────────
async function expandCities(supabase: any, params: any) {
  // Find cities with contractors but low page coverage
  const { data: cityStats } = await supabase.rpc("get_city_coverage_gaps") ?? { data: null };

  // Fallback: manual query
  const { data: cities } = await supabase
    .from("cities")
    .select("id, name, slug")
    .eq("is_active", true);

  const { data: coverage } = await supabase
    .from("home_problem_city_pages")
    .select("city_id");

  const coverageCount: Record<string, number> = {};
  (coverage ?? []).forEach((c: any) => {
    coverageCount[c.city_id] = (coverageCount[c.city_id] ?? 0) + 1;
  });

  const { data: contractorPresence } = await supabase
    .from("contractor_service_areas")
    .select("city_id");

  const contractorCities = new Set(
    (contractorPresence ?? []).map((c: any) => c.city_id)
  );

  // Cities with contractors but few/no pages
  const expansionTargets = (cities ?? [])
    .filter((c: any) => contractorCities.has(c.id) && (coverageCount[c.id] ?? 0) < 5)
    .slice(0, 10);

  for (const city of expansionTargets) {
    await supabase.from("growth_events").insert({
      event_type: "city_expansion_opportunity",
      source_engine: "city_expansion",
      entity_type: "city",
      entity_id: city.id,
      title: `Expansion: ${city.name}`,
      description: `${city.name} a des entrepreneurs mais seulement ${coverageCount[city.id] ?? 0} pages SEO`,
      metadata: { city_slug: city.slug, current_pages: coverageCount[city.id] ?? 0 },
      status: "pending",
    });
  }

  return { status: "ok", expansion_targets: expansionTargets.length };
}

// ─── Transformation Discovery ───────────────────────────────────
async function discoverTransformations(supabase: any) {
  // Find completed projects that could become transformations
  const { data: completedProjects } = await supabase
    .from("projects")
    .select("id, title, description, category_id, city_id, property_id, user_id, photo_urls")
    .eq("status", "completed")
    .order("updated_at", { ascending: false })
    .limit(20);

  let discovered = 0;
  for (const project of completedProjects ?? []) {
    // Check if already suggested
    const { count } = await supabase
      .from("growth_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "transformation_opportunity")
      .eq("entity_id", project.id);

    if ((count ?? 0) > 0) continue;

    // Check if project has photos (before/after potential)
    if (project.photo_urls?.length > 0) {
      await supabase.from("growth_events").insert({
        event_type: "transformation_opportunity",
        source_engine: "transformation_discovery",
        entity_type: "project",
        entity_id: project.id,
        title: `Transformation: ${project.title}`,
        description: `Projet complété avec ${project.photo_urls.length} photos. Potentiel de transformation.`,
        metadata: { category_id: project.category_id, city_id: project.city_id },
        status: "pending",
      });
      discovered++;
    }
  }

  await upsertMetric(supabase, "transformations_discovered", discovered);
  return { status: "ok", discovered };
}

// ─── Traffic Analysis ───────────────────────────────────────────
async function analyzeTraffic(supabase: any) {
  // Snapshot current counts
  const metrics: Array<{ type: string; value: number }> = [];

  const { count: seoTotal } = await supabase
    .from("seo_pages").select("id", { count: "exact", head: true });
  metrics.push({ type: "seo_pages_total", value: seoTotal ?? 0 });

  const { count: seoPublished } = await supabase
    .from("seo_pages").select("id", { count: "exact", head: true }).eq("is_published", true);
  metrics.push({ type: "seo_pages_published", value: seoPublished ?? 0 });

  const { count: cityPages } = await supabase
    .from("home_problem_city_pages").select("id", { count: "exact", head: true });
  metrics.push({ type: "problem_city_pages_total", value: cityPages ?? 0 });

  const { count: cityPublished } = await supabase
    .from("home_problem_city_pages").select("id", { count: "exact", head: true }).eq("is_published", true);
  metrics.push({ type: "problem_city_pages_published", value: cityPublished ?? 0 });

  const { count: projects } = await supabase
    .from("projects").select("id", { count: "exact", head: true });
  metrics.push({ type: "projects_total", value: projects ?? 0 });

  const { count: contractors } = await supabase
    .from("contractors").select("id", { count: "exact", head: true });
  metrics.push({ type: "contractors_total", value: contractors ?? 0 });

  const { count: designProjects } = await supabase
    .from("design_projects").select("id", { count: "exact", head: true });
  metrics.push({ type: "design_projects_total", value: designProjects ?? 0 });

  const { count: appointments } = await supabase
    .from("appointments").select("id", { count: "exact", head: true });
  metrics.push({ type: "appointments_total", value: appointments ?? 0 });

  // Upsert all metrics
  for (const m of metrics) {
    await upsertMetric(supabase, m.type, m.value);
  }

  return { status: "ok", metrics_captured: metrics.length, metrics };
}

// ─── Promote Transformations ────────────────────────────────────
async function promoteTransformations(supabase: any) {
  // Find high-quality design versions with votes
  const { data: topDesigns } = await supabase
    .from("design_versions")
    .select("id, project_id, prompt, result_url, vote_count, created_at")
    .gt("vote_count", 3)
    .order("vote_count", { ascending: false })
    .limit(10);

  let promoted = 0;
  for (const design of topDesigns ?? []) {
    const { count } = await supabase
      .from("growth_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "transformation_promoted")
      .eq("entity_id", design.id);

    if ((count ?? 0) > 0) continue;

    await supabase.from("growth_events").insert({
      event_type: "transformation_promoted",
      source_engine: "transformation_promoter",
      entity_type: "design_version",
      entity_id: design.id,
      title: `Top transformation (${design.vote_count} votes)`,
      metadata: { project_id: design.project_id, vote_count: design.vote_count },
      status: "auto_completed",
    });
    promoted++;
  }

  return { status: "ok", promoted };
}

// ─── Dashboard Data ─────────────────────────────────────────────
async function getDashboard(supabase: any) {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  // Latest metrics
  const { data: latestMetrics } = await supabase
    .from("growth_engine_metrics")
    .select("*")
    .gte("metric_date", thirtyDaysAgo)
    .is("dimension_key", null)
    .order("metric_date", { ascending: false });

  // Recent events
  const { data: recentEvents } = await supabase
    .from("growth_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  // Pending events for review
  const { data: pendingEvents } = await supabase
    .from("growth_events")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(30);

  // Engine status (automation agents for growth)
  const { data: engines } = await supabase
    .from("automation_agents")
    .select("key, name, is_enabled, last_run_at, next_run_at, last_status, category")
    .in("key", [
      "content-expansion", "city-expansion", "transformation-discovery",
      "traffic-analyzer", "transformation-promoter", "authority-recalculator",
      "graph-evolution", "seo-builder-agent",
    ]);

  // Summary stats
  const stats: Record<string, number> = {};
  const latestByType: Record<string, number> = {};
  for (const m of latestMetrics ?? []) {
    if (!latestByType[m.metric_type] || m.metric_date > latestByType[m.metric_type]) {
      stats[m.metric_type] = Number(m.metric_value);
      latestByType[m.metric_type] = m.metric_date;
    }
  }

  // Count events by type
  const eventCounts: Record<string, number> = {};
  for (const e of recentEvents ?? []) {
    eventCounts[e.event_type] = (eventCounts[e.event_type] ?? 0) + 1;
  }

  return {
    stats,
    eventCounts,
    recentEvents: recentEvents?.slice(0, 20),
    pendingEvents,
    engines: engines ?? [],
  };
}

// ─── Flywheel Status ────────────────────────────────────────────
async function getFlywheelStatus(supabase: any) {
  const stages = [
    { key: "problem_graph", label: "Home Problem Graph", table: "home_problems", countField: "is_active" },
    { key: "seo_pages", label: "SEO Pages", table: "seo_pages", countField: "is_published" },
    { key: "city_pages", label: "Problem × City Pages", table: "home_problem_city_pages", countField: null },
    { key: "design_projects", label: "Design AI", table: "design_projects", countField: null },
    { key: "projects", label: "Projects", table: "projects", countField: null },
    { key: "appointments", label: "Appointments", table: "appointments", countField: null },
    { key: "contractors", label: "Contractors", table: "contractors", countField: null },
  ];

  const result: Array<{ key: string; label: string; count: number }> = [];
  for (const s of stages) {
    const { count } = await supabase.from(s.table).select("id", { count: "exact", head: true });
    result.push({ key: s.key, label: s.label, count: count ?? 0 });
  }

  return { stages: result };
}

// ─── Event Approval ─────────────────────────────────────────────
async function approveEvent(supabase: any, params: any) {
  const { event_id, user_id } = params;
  const { error } = await supabase
    .from("growth_events")
    .update({ status: "approved", reviewed_by: user_id, reviewed_at: new Date().toISOString() })
    .eq("id", event_id);

  if (error) return { error: error.message };

  // If it's a content_generated event, publish the associated page
  const { data: event } = await supabase
    .from("growth_events")
    .select("*")
    .eq("id", event_id)
    .single();

  if (event?.event_type === "content_generated" && event?.entity_type === "problem_city_page") {
    // Find and publish the page
    const meta = event.metadata as any;
    if (meta?.problem_slug && meta?.city_slug) {
      await supabase
        .from("home_problem_city_pages")
        .update({ is_published: true })
        .eq("problem_id", event.entity_id);
    }
  }

  return { status: "approved" };
}

async function rejectEvent(supabase: any, params: any) {
  const { event_id, user_id } = params;
  await supabase
    .from("growth_events")
    .update({ status: "rejected", reviewed_by: user_id, reviewed_at: new Date().toISOString() })
    .eq("id", event_id);
  return { status: "rejected" };
}

// ─── Helpers ────────────────────────────────────────────────────
async function upsertMetric(supabase: any, metricType: string, value: number, dimKey?: string, dimValue?: string) {
  const today = new Date().toISOString().split("T")[0];
  await supabase.from("growth_engine_metrics").upsert(
    {
      metric_date: today,
      metric_type: metricType,
      metric_value: value,
      dimension_key: dimKey ?? null,
      dimension_value: dimValue ?? null,
    },
    { onConflict: "metric_date,metric_type,COALESCE(dimension_key,''),COALESCE(dimension_value,'')" }
  );
}

function generatePageContent(problem: any, city: any) {
  // Static template content — AI generation can be added later via Lovable AI
  return {
    faq: [
      {
        question: `Quels sont les signes de ${problem.name_fr} à ${city.name}?`,
        answer: `Les signes courants incluent des dommages visibles, des variations de performance et des coûts énergétiques accrus. Consultez un professionnel UNPRO vérifié pour un diagnostic précis.`,
      },
      {
        question: `Combien coûte la réparation de ${problem.name_fr} à ${city.name}?`,
        answer: `Les coûts varient selon l'ampleur des travaux. Utilisez notre outil de soumission pour obtenir des estimations précises d'entrepreneurs vérifiés de ${city.name}.`,
      },
    ],
    localTips: `À ${city.name}, nous recommandons de faire inspecter régulièrement votre propriété par un professionnel certifié. Les conditions climatiques locales peuvent accélérer certains problèmes.`,
    content: `Guide complet pour résoudre ${problem.name_fr} à ${city.name}. Trouvez des entrepreneurs vérifiés, comparez les coûts et planifiez vos rénovations avec UNPRO.`,
  };
}

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
      "Content-Type": "application/json",
    },
  });
}
