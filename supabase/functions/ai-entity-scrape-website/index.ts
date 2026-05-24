// AI Entity — scrape website via Firecrawl (homepage + /services + /a-propos + sitemap top URLs).
// Persists raw payload into ai_entity_sources(source_type='website').
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2/scrape";
const FIRECRAWL_MAP = "https://api.firecrawl.dev/v2/map";

async function scrape(url: string, key: string): Promise<{ markdown: string; links: string[]; metadata: any } | null> {
  try {
    const r = await fetch(FIRECRAWL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "links"], onlyMainContent: true }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const d = j?.data ?? j;
    return { markdown: d?.markdown ?? "", links: d?.links ?? [], metadata: d?.metadata ?? {} };
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY missing");

    const { entity_id } = await req.json();
    if (!entity_id) throw new Error("entity_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: entity, error } = await supabase
      .from("ai_entities").select("id, website").eq("id", entity_id).single();
    if (error || !entity?.website) throw new Error("Entity has no website");

    const base = entity.website.replace(/\/$/, "");
    const pages = [base, `${base}/services`, `${base}/a-propos`, `${base}/about`, `${base}/contact`];
    const results = await Promise.all(pages.map((u) => scrape(u, FIRECRAWL_API_KEY)));
    const corpus = results.filter(Boolean).map((r) => r!.markdown).filter(Boolean).join("\n\n---\n\n");
    const allLinks = Array.from(new Set(results.flatMap((r) => r?.links ?? [])));

    await supabase.from("ai_entity_sources").upsert({
      entity_id,
      source_type: "website",
      source_url: base,
      status: corpus ? "ok" : "empty",
      last_sync: new Date().toISOString(),
      raw_payload: { corpus: corpus.slice(0, 50000), links: allLinks.slice(0, 200), metadata: results[0]?.metadata ?? {} },
    }, { onConflict: "entity_id,source_type" } as any);

    await supabase.from("ai_entities").update({ last_ingested_at: new Date().toISOString() }).eq("id", entity_id);

    return new Response(JSON.stringify({ ok: true, corpus_length: corpus.length, links: allLinks.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
