// LIVE Agent — Orchestrator: full pipeline for a (city, trade) batch
// discover → enrich top N → score → draft outreach
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const invoke = async (fn: string, body: any) => {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await r.json();
  };

  let runId: string | null = null;
  try {
    const { city, trade, discover_limit = 15, enrich_limit = 10, draft_limit = 5 } = await req.json();
    if (!city || !trade) throw new Error("city + trade required");

    const { data: run } = await supabase.from("live_agent_runs").insert({
      agent_name: "live-agent-go-live", agent_type: "orchestrator",
      input: { city, trade, discover_limit, enrich_limit, draft_limit },
      run_status: "running",
    }).select("id").single();
    runId = run?.id ?? null;

    // 1) Discover
    const discRes = await invoke("live-agent-discover", { city, trade, limit: discover_limit });
    const discovered = discRes.inserted || [];

    // 2) Enrich top N
    const toEnrich = discovered.slice(0, enrich_limit);
    const enrichedIds: string[] = [];
    for (const p of toEnrich) {
      const r = await invoke("live-agent-enrich", { prospect_id: p.id });
      if (r.success) enrichedIds.push(p.id);
    }

    // 3) Score
    let scored: any[] = [];
    if (enrichedIds.length) {
      const sRes = await invoke("live-agent-score", { prospect_ids: enrichedIds });
      scored = sRes.results || [];
    }

    // 4) Draft outreach for prospects with email, sorted by priority
    const withEmail: any[] = [];
    if (enrichedIds.length) {
      const { data } = await supabase.from("contractor_prospects")
        .select("id, email, priority_score, business_name")
        .in("id", enrichedIds)
        .not("email", "is", null)
        .order("priority_score", { ascending: false })
        .limit(draft_limit);
      withEmail.push(...(data || []));
    }
    const drafts: any[] = [];
    for (const p of withEmail) {
      const r = await invoke("live-agent-outreach-draft", { prospect_id: p.id });
      if (r.success) drafts.push({ prospect_id: p.id, business_name: p.business_name, draft_id: r.draft?.id });
    }

    const summary = {
      discovered_count: discovered.length,
      enriched_count: enrichedIds.length,
      scored_count: scored.length,
      drafts_count: drafts.length,
      city, trade,
    };

    if (runId) await supabase.from("live_agent_runs").update({
      run_status: "completed", finished_at: new Date().toISOString(),
      output: { ...summary, drafts, scored: scored.slice(0, 10) },
    }).eq("id", runId);

    return new Response(JSON.stringify({ success: true, summary, drafts, scored, run_id: runId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    if (runId) await supabase.from("live_agent_runs").update({
      run_status: "failed", finished_at: new Date().toISOString(), error_message: e.message,
    }).eq("id", runId);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
