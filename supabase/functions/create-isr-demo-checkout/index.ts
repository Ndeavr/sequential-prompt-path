// Demo ISR — Signature checkout at $1 with private promo code.
// Server-side guardrails: only plan=Signature, only code ISR_SIGNATURE_TEST,
// only contractor "Isolation Solution Royal", only 100 cents CAD.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_PLAN = "Signature";
const ALLOWED_CODE = "ISR_SIGNATURE_TEST";
const ALLOWED_CONTRACTOR = "Isolation Solution Royal";
const DEMO_PRICE_CENTS = 100;
const NORMAL_PRICE_CENTS = 179900;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const plan = String(body?.plan ?? "");
    const promo_code = String(body?.promo_code ?? "");
    const contractor_name = String(body?.contractor_name ?? "");
    const demo_run_id: string | undefined = body?.demo_run_id;

    if (plan !== ALLOWED_PLAN || promo_code !== ALLOWED_CODE || contractor_name !== ALLOWED_CONTRACTOR) {
      return new Response(
        JSON.stringify({ error: "Invalid demo parameters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Missing STRIPE_SECRET_KEY");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const origin = req.headers.get("origin") ?? "https://www.unpro.ca";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: DEMO_PRICE_CENTS,
          product_data: {
            name: "UNPRO Signature — ISR Demo",
            description: "Activation démo Signature à 1$ pour Isolation Solution Royal.",
          },
        },
      }],
      metadata: {
        contractor_name: ALLOWED_CONTRACTOR,
        legal_name: "9480-0976 Québec inc.",
        website: "isroyal.ca",
        demo_flow: "isroyal_alex_plan_test",
        selected_plan: ALLOWED_PLAN,
        promo_code: ALLOWED_CODE,
        source: "demo_isroyal_alex_plan_test",
        demo_run_id: demo_run_id ?? "",
      },
      success_url: `${origin}/demo/isroyal-alex-plan-test/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/demo/isroyal-alex-plan-test/cancel`,
    });

    // Log to Supabase
    const supaUrl = Deno.env.get("SUPABASE_URL");
    const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supaUrl && supaKey) {
      const supabase = createClient(supaUrl, supaKey);
      const patch = {
        company_name: ALLOWED_CONTRACTOR,
        legal_name: "9480-0976 Québec inc.",
        website: "isroyal.ca",
        phone_primary: "514-249-9522",
        phone_secondary: "514-941-3141",
        recommended_plan: ALLOWED_PLAN,
        normal_price_cents: NORMAL_PRICE_CENTS,
        demo_price_cents: DEMO_PRICE_CENTS,
        promo_code: ALLOWED_CODE,
        promo_valid: true,
        stripe_session_id: session.id,
        payment_status: "checkout_started",
        flow_status: "checkout_started",
      };
      if (demo_run_id) {
        await supabase.from("demo_contractor_plan_tests").update(patch).eq("id", demo_run_id);
      } else {
        await supabase.from("demo_contractor_plan_tests").insert(patch);
      }
    }

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    console.error("[create-isr-demo-checkout]", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
