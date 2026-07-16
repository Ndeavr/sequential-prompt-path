// Founder Premium activation checkout.
// Charges 1 CAD today via add_invoice_items, then 7-day trial, then 599 CAD/mo subscription.
// Reads amounts from billing_offers.founder_premium_7d — never hardcoded.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

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

    // --- Load offer (source of truth) ---
    const { data: offer, error: offerErr } = await admin
      .from("billing_offers")
      .select("*")
      .eq("offer_code", offer_code)
      .eq("is_active", true)
      .maybeSingle();

    if (offerErr || !offer) {
      return json({ error: "offer_not_found", detail: offerErr?.message }, 404);
    }

    // --- Integrity guard: for Founder path, refuse if activation > 2 CAD ---
    if (offer.activation_amount_cents > 200) {
      await admin.from("system_integrity_incidents").insert({
        incident_type: "founder_activation_amount_too_high",
        severity: "critical",
        entity_type: "billing_offer",
        entity_id: offer.id,
        detected_value: { activation_amount_cents: offer.activation_amount_cents },
        expected_value: { activation_amount_cents: 100 },
        repair_status: "blocked_checkout",
      }).catch(() => {});
      return json({ error: "offer_integrity_failed" }, 409);
    }

    if (!offer.stripe_activation_price_id || !offer.stripe_recurring_price_id) {
      return json({ error: "stripe_prices_missing" }, 500);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "stripe_not_configured" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const origin = req.headers.get("origin") || "https://unpro.ca";
    const successUrl = `${origin}${success_path || "/entrepreneur/activer/succes"}?session_id={CHECKOUT_SESSION_ID}&offer=${offer.offer_code}`;
    const cancelUrl = `${origin}${cancel_path || "/entrepreneur/activer/plan"}?canceled=1`;

    // Try to reuse existing customer for logged-in users
    let customerId: string | undefined;
    const effectiveEmail = email || userEmail;
    if (effectiveEmail) {
      const list = await stripe.customers.list({ email: effectiveEmail, limit: 1 });
      if (list.data.length > 0) customerId = list.data[0].id;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : effectiveEmail,
      line_items: [{ price: offer.stripe_recurring_price_id, quantity: 1 }],
      subscription_data: {
        trial_period_days: offer.trial_days,
      },
      // 1 $ activation billed on the first (trial) invoice — issued immediately.
      add_invoice_items: [
        { price: offer.stripe_activation_price_id, quantity: 1 },
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
          message:
            "1 $ aujourd'hui + taxes. 7 jours d'accès Fondateur. Puis 599 $/mois + taxes, sauf annulation avant la fin de l'essai.",
        },
      },
      metadata: {
        offer_code: offer.offer_code,
        offer_id: offer.id,
        user_id: userId ?? "",
        onboarding_session_id: onboarding_session_id ?? "",
        activation_amount_cents: String(offer.activation_amount_cents),
        recurring_amount_cents: String(offer.recurring_amount_cents),
        trial_days: String(offer.trial_days),
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return json({
      url: session.url,
      session_id: session.id,
      expected_today_cents: offer.activation_amount_cents,
      expected_recurring_cents: offer.recurring_amount_cents,
      trial_days: offer.trial_days,
    });
  } catch (e) {
    const err = e as { message?: string };
    console.error("[create-founder-activation-checkout]", err?.message || e);
    return json({ error: "internal_error", detail: err?.message ?? String(e) }, 500);
  }
});
