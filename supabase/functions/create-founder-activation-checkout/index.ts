// Contractor activation checkout — CANONICAL OFFER.
//
// REPAIR (2026-08-24): this function used to open a 1 CAD / 7-day-trial
// subscription that then rolled into 599 CAD/mo. That offer is OBSOLETE.
// The single canonical contractor entry offer is the pack d'entrée UNPRO:
// 350 CAD CA, one-time payment, no subscription (see _shared/offerCopy.ts).
// The endpoint keeps its name and response shape so existing callers
// (ScreenPayment, agent dispatch) keep working.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { OFFER as OFFER_350 } from "../_shared/offerCopy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Optional auth (works for guest checkout too)
    let userEmail: string | undefined;
    let userId: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const authClient = createClient(supabaseUrl, anonKey);
      const { data } = await authClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (data?.user) {
        userEmail = data.user.email ?? undefined;
        userId = data.user.id;
      }
    }

    const body = await req.json().catch(() => ({}));
    const {
      offer_code = "founder_premium_7d",
      email,
      onboarding_session_id,
      success_path,
      cancel_path,
    } = (body ?? {}) as Record<string, string | undefined>;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "stripe_not_configured" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const origin = req.headers.get("origin") || "https://unpro.ca";
    const successUrl = `${origin}${success_path || "/entrepreneur/activer/succes"}?session_id={CHECKOUT_SESSION_ID}&offer=pack_350`;
    const cancelUrl = `${origin}${cancel_path || "/entrepreneur/activer/plan"}?canceled=1`;

    // Reuse an existing Stripe customer when we know the email.
    let customerId: string | undefined;
    const effectiveEmail = email || userEmail;
    if (effectiveEmail) {
      const list = await stripe.customers.list({ email: effectiveEmail, limit: 1 });
      if (list.data.length > 0) customerId = list.data[0].id;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      customer: customerId,
      customer_email: customerId ? undefined : effectiveEmail,
      line_items: [
        {
          price_data: {
            currency: "cad",
            unit_amount: OFFER_350.price_cents,
            product_data: {
              name: "Pack d'entrée UNPRO",
              description: `${OFFER_350.headline}. ${OFFER_350.payment_note}`,
            },
          },
          quantity: 1,
        },
      ],
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      ...(customerId ? { customer_update: { address: "auto", name: "auto" } } : {}),
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: "fr",
      custom_text: {
        submit: {
          message: `${OFFER_350.price_label} CA + taxes, paiement unique. Aucun abonnement, aucun prélèvement récurrent.`,
        },
      },
      metadata: {
        offer_code: "pack_350",
        offer_kind: "pack_350",
        user_id: userId ?? "",
        onboarding_session_id: onboarding_session_id ?? "",
        amount_cents: String(OFFER_350.price_cents),
        legacy_offer_code_requested: offer_code ?? "",
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return json({
      url: session.url,
      session_id: session.id,
      offer_kind: "pack_350",
      expected_today_cents: OFFER_350.price_cents,
      expected_recurring_cents: 0,
      trial_days: 0,
    });
  } catch (e) {
    const err = e as { message?: string };
    console.error("[create-founder-activation-checkout:pack_350]", err?.message || e);
    return json({ error: "internal_error", detail: err?.message ?? String(e) }, 500);
  }
});
