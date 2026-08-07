// Creates a Stripe Checkout session for an outbound landing prospect.
// POST { slug, token, plan_code }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CANONICAL PRICING — never hardcode amounts here. See _shared/planCatalog.ts.
import { resolvePlan, planLineItem, planMetadata, planErrorResponse } from "../_shared/planCatalog.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { slug, token, plan_code } = await req.json();
    if (!slug || !token || !plan_code) {
      return new Response(JSON.stringify({ error: "slug, token, plan_code requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: landing, error: landErr } = await supabase
      .from("outbound_landing_pages")
      .select("id, lead_id, company_id, landing_token, page_slug")
      .eq("page_slug", slug)
      .maybeSingle();
    if (landErr || !landing) {
      return new Response(JSON.stringify({ error: "Page introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (landing.landing_token !== token) {
      return new Response(JSON.stringify({ error: "Lien invalide" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await supabase
      .from("outbound_companies").select("email, company_name").eq("id", landing.company_id).maybeSingle();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    let plan;
    try {
      plan = await resolvePlan(supabase, plan_code);
    } catch (e) {
      return planErrorResponse(e, corsHeaders);
    }

    const origin = req.headers.get("origin") || "https://unpro.ca";
    const successUrl = `${origin}/pro/diagnostic/${slug}/merci?session_id={CHECKOUT_SESSION_ID}&t=${token}`;
    const cancelUrl = `${origin}/pro/diagnostic/${slug}?t=${token}&cancelled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: plan.recurring ? "subscription" : "payment",
      customer_email: company?.email || undefined,
      line_items: [planLineItem(plan, "month")],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: planMetadata(plan, {
        source: "outbound_landing",
        landing_id: landing.id,
        lead_id: landing.lead_id ?? "",
        company_id: landing.company_id ?? "",
        slug,
      }),
    });

    // Mark checkout started
    await supabase.from("outbound_landing_pages").update({
      checkout_started_at: new Date().toISOString(),
      checkout_session_id: session.id,
      checkout_plan_code: plan.code,
    }).eq("id", landing.id);

    if (landing.lead_id) {
      await supabase.from("outbound_events").insert({
        lead_id: landing.lead_id,
        event_type: "checkout_started",
        event_value: plan.code,
        event_payload: { session_id: session.id },
      });
    }

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[outbound-checkout-start]", e);
    return new Response(JSON.stringify({ error: e.message ?? "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
