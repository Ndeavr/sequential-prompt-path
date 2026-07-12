// pro-founder-checkout-guest — Guest checkout for the Fondateur plan.
// Charges 1 $ CA today (one-time line) + 149 $/mo subscription with a 7-day trial.
// No authentication required: Stripe collects the email at the checkout page.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function logStep(
  admin: ReturnType<typeof createClient>,
  step: string,
  payload: Record<string, unknown>,
) {
  try {
    await admin.from("activation_flow_events").insert({
      step,
      status: "ok",
      ...payload,
    });
  } catch (_) {
    /* soft-fail */
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { prospectId, email, planSlug } = await req.json();
    const slug = planSlug || "fondateur-149";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: plan, error: planErr } = await admin
      .from("founder_plans")
      .select("id, price, name, status, spots_remaining")
      .eq("slug", slug)
      .maybeSingle();
    if (planErr || !plan) throw new Error("Plan not found");
    if (plan.status !== "open" || plan.spots_remaining <= 0)
      throw new Error("Plan complet");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const origin = req.headers.get("origin") ?? "https://unpro.ca";

    // Two line items in one Checkout Session:
    //   1) One-time CA$1.00 activation fee — charged today.
    //   2) Recurring subscription at the plan price with a 7-day free trial.
    // Stripe renders: "CA$1.00 due today · then CA$149.00/month after 7-day trial".
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: "UNPRO — Activation 7 jours",
              description: "Frais d'activation unique · 1 $ CA payé aujourd'hui.",
            },
            unit_amount: 100,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: plan.name,
              description:
                "Profil IA optimisé · Recommandations propriétaires · Accès Alex · Jusqu'à 3 rendez-vous exclusifs · Annulation en tout temps",
            },
            unit_amount: plan.price,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        trial_settings: {
          end_behavior: { missing_payment_method: "pause" },
        },
      },
      payment_method_collection: "always",
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      success_url: `${origin}/pro/welcome?session_id={CHECKOUT_SESSION_ID}&prospect=${prospectId ?? ""}`,
      cancel_url: `${origin}/pro/score?canceled=1`,
      metadata: {
        plan_slug: slug,
        plan_id: plan.id,
        prospect_id: prospectId ?? "",
        source: "first_customer_48h",
        offer: "fondateur_1cad_7d_then_149",
      },
    });

    if (prospectId) {
      await admin
        .from("founder_score_prospects")
        .update({ status: "checkout_started", stripe_session_id: session.id })
        .eq("id", prospectId);
    }

    await logStep(admin, "checkout_started", {
      prospect_id: prospectId ?? null,
      email: email ?? null,
      stripe_session_id: session.id,
      metadata: { plan_slug: slug, offer: "fondateur_1cad_7d_then_149" },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
