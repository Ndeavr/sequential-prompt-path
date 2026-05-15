// UNPRO — brand-backfill-logos
// Iterates brands missing a logo and invokes brand-fetch-logo with concurrency.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function callFetchLogo(brand_id: string, force: boolean) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/brand-fetch-logo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ brand_id, force }),
    });
    const data = await r.json().catch(() => ({}));
    return { brand_id, status: r.status, ...data };
  } catch (e) {
    return { brand_id, error: String(e?.message ?? e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const force = !!body.force;
    const limit = Math.min(Number(body.limit ?? 100), 500);
    const concurrency = Math.min(Number(body.concurrency ?? 5), 10);

    let q = supabase.from("brands").select("id, slug").limit(limit);
    if (!force) {
      q = q.is("logo_svg_url", null).is("logo_png_url", null);
    }
    const { data: brands, error } = await q;
    if (error) throw error;

    const results: any[] = [];
    let i = 0;
    async function worker() {
      while (i < (brands?.length ?? 0)) {
        const idx = i++;
        const b = brands![idx];
        const r = await callFetchLogo(b.id, force);
        results.push(r);
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    return new Response(
      JSON.stringify({ processed: results.length, succeeded, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
