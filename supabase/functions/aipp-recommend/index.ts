// Alex tool: recommend contractor based on semantic similarity
// Used in chat / voice context to surface AIPP MAX contractors
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function aiEmbed(input: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input }),
  });
  if (!res.ok) throw new Error(`Embed ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { query, city, limit = 3 } = await req.json();
    if (!query) throw new Error("query required");

    const embedding = await aiEmbed(query);
    const { data: matches, error } = await supabase.rpc("match_contractor_chunks", {
      query_embedding: embedding,
      filter_contractor_id: null,
      match_count: limit * 5,
    });
    if (error) throw error;

    // Aggregate by contractor + join scores
    const byContractor = new Map<string, { sim: number; chunks: any[] }>();
    for (const m of matches ?? []) {
      const e = byContractor.get(m.contractor_id) ?? { sim: 0, chunks: [] };
      e.sim = Math.max(e.sim, m.similarity);
      e.chunks.push(m);
      byContractor.set(m.contractor_id, e);
    }

    const ids = Array.from(byContractor.keys()).slice(0, limit);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contractors } = await supabase
      .from("contractors")
      .select("id, slug, business_name, city, specialty, aipp_score, rating, review_count, website, logo_url")
      .in("id", ids);

    const { data: aiProfiles } = await supabase
      .from("contractor_ai_profiles")
      .select("contractor_id, summary_fr, recommendation_reasons, best_for")
      .in("contractor_id", ids)
      .eq("is_current", true);

    const filtered = (contractors ?? [])
      .filter((c) => !city || (c.city ?? "").toLowerCase().includes(city.toLowerCase()))
      .map((c) => {
        const ai = aiProfiles?.find((a) => a.contractor_id === c.id);
        const sim = byContractor.get(c.id)?.sim ?? 0;
        return {
          ...c,
          similarity: sim,
          summary_fr: ai?.summary_fr,
          recommendation_reasons: ai?.recommendation_reasons ?? [],
          best_for: ai?.best_for ?? [],
          profile_url: `/pro/${c.slug}`,
        };
      })
      .sort((a, b) => (b.aipp_score ?? 0) * 0.4 + b.similarity * 60 - ((a.aipp_score ?? 0) * 0.4 + a.similarity * 60));

    return new Response(
      JSON.stringify({ matches: filtered.slice(0, limit) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
