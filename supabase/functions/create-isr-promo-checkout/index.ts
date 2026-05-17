// Creates a $1 promo Stripe Checkout session for the ISR (or any) live-run prospect.
// One-time $1 CAD payment that marks the prospect as activated on success.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { slug, run_id, plan_code = "premium" } = await req.json();
    if (!slug) throw new Error("slug required");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const { data: p } = await sb
      .from("war_prospects")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (!p) throw new Error(`prospect_not_found:${slug}`);

    const origin = req.headers.get("origin") || "https://unpro.ca";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: p.email || undefined,
      customer_creation: "always",
      payment_intent_data: {
        description: `UNPRO Premium — Activation 1$ (${p.company_name})`,
      },
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `UNPRO Premium — Activation 1$`,
              description: `Activation promo live-run pour ${p.company_name}`,
            },
            unit_amount: 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/pro/${slug}/success?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pro/${slug}?cancelled=1`,
      metadata: {
        source: "sms_live_run",
        campaign: "isr_first_live_test",
        contractor_name: p.company_name,
        prospect_id: p.id,
        slug,
        plan_code,
        phone: p.phone || "",
        website: p.website || "",
        run_id: run_id || "",
      },
    });

    // Log checkout_started
    if (run_id) {
      await sb.from("acquisition_run_steps").upsert(
        {
          run_id,
          step_key: "checkout_started",
          step_order: 9,
          status: "succeeded",
          logs: [
            {
              at: new Date().toISOString(),
              session_id: session.id,
              amount_cad: 1,
            },
          ],
          completed_at: new Date().toISOString(),
        },
        { onConflict: "run_id,step_key" }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id, amount: 1 }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[create-isr-promo-checkout]", e);
    return new Response(
      JSON.stringify({ error: String((e as any)?.message ?? e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
