// Create a Stripe one-time checkout for the 1$/7d activation offer.
// Public: prospects can pay before having an account (email collected by Stripe).
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVATION_PRICE_ID = "price_1TZD1rCvZwK1QnPVPZEGhJrs";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { slug, email } = await req.json();
    if (!slug) {
      return new Response(JSON.stringify({ error: "missing_slug" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: prospect } = await supabase
      .from("prospect_pages").select("*").eq("slug", slug).maybeSingle();

    if (!prospect) {
      return new Response(JSON.stringify({ error: "prospect_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    const origin = req.headers.get("origin") || "https://unpro.ca";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: ACTIVATION_PRICE_ID, quantity: 1 }],
      customer_email: email || undefined,
      success_url: `${origin}/activation-success?session_id={CHECKOUT_SESSION_ID}&slug=${encodeURIComponent(slug)}`,
      cancel_url: `${origin}/pro/${encodeURIComponent(slug)}?canceled=1`,
      metadata: {
        prospect_slug: slug,
        prospect_id: prospect.id,
        offer: "activation_7d",
      },
      locale: "fr",
    });

    await supabase.from("prospect_page_events").insert({
      slug, event_type: "checkout_started", metadata: { session_id: session.id },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
