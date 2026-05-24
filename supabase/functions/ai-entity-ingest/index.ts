// AI Entity — orchestrator. Runs: scrape-website -> summary. Optionally chain RBQ/NEQ if numbers known.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function invoke(fn: string, body: unknown) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* keep text */ }
  return { ok: r.ok, status: r.status, body: parsed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { entity_id } = await req.json();
    if (!entity_id) throw new Error("entity_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: entity } = await supabase.from("ai_entities").select("id, website").eq("id", entity_id).single();
    if (!entity) throw new Error("Entity not found");

    const steps: Record<string, unknown> = {};

    if (entity.website) {
      steps.scrape = await invoke("ai-entity-scrape-website", { entity_id });
      steps.summary = await invoke("ai-entity-summary", { entity_id });
    } else {
      steps.scrape = { skipped: "no_website" };
    }

    await supabase.rpc("recompute_ai_entity_score", { p_entity: entity_id });

    return new Response(JSON.stringify({ ok: true, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
