// UNPRO — Curiosity checkout start.
// Logs the CTA click + checkout_started events and returns the activation URL
// that funnels into the existing /entrepreneur/join → Stripe checkout flow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_BASE = "https://app.unpro.ca";

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
    const { data: lead, error } = await sb
      .from("contractor_leads")
      .select("id")
      .eq("curiosity_slug", slug)
      .eq("curiosity_token", token)
      .maybeSingle();
    if (error) throw error;
    if (!lead) {
      return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await Promise.all([
      sb.from("curiosity_funnel_events").insert({
        lead_id: lead.id, slug, event_type: "cta_activate_clicked", metadata: {},
      }),
      sb.from("curiosity_funnel_events").insert({
        lead_id: lead.id, slug, event_type: "checkout_started", metadata: { src: "ia_curiosity" },
      }),
      sb.from("contractor_leads").update({
        onboarding_started_at: new Date().toISOString(),
        pipeline_status: "onboarding_started",
      }).eq("id", lead.id),
    ]);

    const activationUrl = `${APP_BASE}/entrepreneur/join?lead=${lead.id}&t=${encodeURIComponent(token)}&src=ia_curiosity`;
    return new Response(JSON.stringify({ ok: true, activation_url: activationUrl }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
