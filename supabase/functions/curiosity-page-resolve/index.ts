// UNPRO — Public resolver for /ia/:slug landing page.
// Returns a safe summary of the lead and logs a page_view event.
// Requires a valid (slug, token) pair. No PII leaked.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const slug = String(body.slug || "").trim();
    const token = String(body.token || "").trim();
    if (!slug || !token) {
      return new Response(JSON.stringify({ ok: false, error: "missing_slug_or_token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await sb.rpc("resolve_curiosity_slug", { _slug: slug, _token: token });
    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark sequence as clicked if not already
    await sb.from("curiosity_sequences")
      .update({ clicked_at: new Date().toISOString() })
      .eq("lead_id", (data as any).lead_id)
      .is("clicked_at", null);

    return new Response(JSON.stringify({ ok: true, lead: data }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
