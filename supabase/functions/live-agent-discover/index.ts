// LIVE Agent — Discovery via Firecrawl Search
// Finds real contractors by city + trade, dedupes, inserts into contractor_prospects
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let runId: string | null = null;
  try {
    const { city, trade, limit = 15 } = await req.json();
    if (!city || !trade) {
      return new Response(JSON.stringify({ error: "city + trade required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const { data: run } = await supabase.from("live_agent_runs").insert({
      agent_name: "live-agent-discover", agent_type: "discovery",
      input: { city, trade, limit }, run_status: "running",
    }).select("id").single();
    runId = run?.id ?? null;

    const query = `${trade} ${city} Québec entrepreneur`;
    const fc = await fetch(`${FIRECRAWL_V2}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, lang: "fr", country: "ca" }),
    });
    const fcData = await fc.json();
    if (!fc.ok) throw new Error(`Firecrawl: ${fc.status} ${JSON.stringify(fcData).slice(0,200)}`);

    const results = (fcData.data?.web ?? fcData.data ?? fcData.web ?? []) as any[];
    const inserted: any[] = [];
    const skipped: any[] = [];

    for (const r of results) {
      const url = r.url || r.link;
      const title = r.title || "";
      if (!url) continue;
      let domain = "";
      try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch { continue; }

      // Skip directories / aggregators
      if (/google\.|facebook\.|yelp\.|yellowpages\.|pagesjaunes\.|kijiji\.|reddit\.|wikipedia\./i.test(domain)) {
        skipped.push({ url, reason: "directory" }); continue;
      }

      const businessName = (title.split(/[|\-–—•]/)[0] || domain).trim().slice(0, 120);

      // Dedupe by website_url or business_name+city
      const { data: existing } = await supabase.from("contractor_prospects")
        .select("id")
        .or(`website_url.eq.https://${domain},website_url.eq.${url}`)
        .maybeSingle();
      if (existing) { skipped.push({ url, reason: "exists" }); continue; }

      const { data: ins, error: insErr } = await supabase.from("contractor_prospects").insert({
        business_name: businessName,
        website_url: url,
        city, trade, category_slug: trade,
        province: "QC",
        source: "firecrawl_search",
        source_name: "firecrawl",
        discovery_method: "search_query",
        source_url: url,
        language_guess: "fr",
        enrichment_status: "pending",
        qualification_status: "discovered",
        raw_data: { query, snippet: r.description || r.snippet || "" },
      }).select("id, business_name, website_url, city, trade").single();

      if (insErr) { skipped.push({ url, reason: insErr.message }); continue; }
      inserted.push(ins);
    }

    if (runId) await supabase.from("live_agent_runs").update({
      run_status: "completed", finished_at: new Date().toISOString(),
      output: { inserted_count: inserted.length, skipped_count: skipped.length, inserted, skipped: skipped.slice(0, 20) },
    }).eq("id", runId);

    return new Response(JSON.stringify({ success: true, inserted, skipped_count: skipped.length, run_id: runId }), {
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
