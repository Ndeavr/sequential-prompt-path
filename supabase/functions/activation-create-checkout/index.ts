// Creates the CANONICAL contractor activation Checkout Session for a pipeline run.
// Offre canonique : pack d'entrée UNPRO — 350 $ CA, paiement unique.
// L'ancienne offre « 1 $ » est OBSOLÈTE et interdite (voir _shared/offerCopy.ts).
// Guest-friendly (no auth required). Returns { url } for client redirect.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { OFFER as OFFER_350 } from "../_shared/offerCopy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_LABEL: Record<string, string> = {
  pro: "Pro",
  premium: "Premium",
  elite: "Élite",
  signature: "Signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { run_id } = await req.json();
    if (!run_id) throw new Error("run_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: run, error } = await supabase
      .from("activation_pipeline_runs")
      .select("id, domain, recommended_plan, aipp_score, extraction, signals")
      .eq("id", run_id)
      .maybeSingle();
    if (error || !run) throw new Error("run not found");

    const plan = (run.recommended_plan as string) ?? "pro";
    const planLabel = PLAN_LABEL[plan] ?? "Pro";
    const signals = (run.signals ?? {}) as Record<string, unknown>;
    const extraction = (run.extraction ?? {}) as Record<string, unknown>;
    const emails = Array.isArray(signals.emails_found)
      ? (signals.emails_found as string[])
      : [];
    const customerEmail = emails[0] ?? null;
    const businessName =
      (extraction?.metadata as Record<string, unknown> | undefined)?.title as string ?? run.domain ?? "Entrepreneur UNPRO";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") ||
      `https://${req.headers.get("host") ?? "unpro.ca"}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "cad",
            unit_amount: OFFER_350.price_cents, // 350,00 CAD — source unique
            product_data: {
              name: `Pack d'entrée UNPRO — ${planLabel}`,
              description:
                `Activation immédiate du profil entrepreneur (${run.domain ?? ""}). ${OFFER_350.price_label} CA, paiement unique.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        run_id: String(run.id),
        plan,
        domain: String(run.domain ?? ""),
        aipp_score: String(run.aipp_score ?? ""),
        offer_kind: "pack_350",
        amount_cents: String(OFFER_350.price_cents),
      },
      success_url:
        `${origin}/contractor/activated?session={CHECKOUT_SESSION_ID}&run=${run.id}`,
      cancel_url: `${origin}/contractor/analysis?run=${run.id}`,
    });

    await supabase
      .from("activation_pipeline_runs")
      .update({ stripe_session_id: session.id })
      .eq("id", run.id);

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
