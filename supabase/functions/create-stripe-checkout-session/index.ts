import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { ensureQuebecTaxRates } from "../_shared/entry350Tax.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { plan_code, billing_cycle, coupon_code, onboarding_session_id } = await req.json();

    if (!plan_code) throw new Error("plan_code is required");

    // Auth user (optional for guest checkout)
    let userEmail: string | null = null;
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        userEmail = data.user.email ?? null;
        userId = data.user.id;
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Source of truth: only active, current contractor plans can be bought.
    const allowedPlans = new Set(["depart", "croissance_v2", "pro_v2", "elite_v2"]);
    if (!allowedPlans.has(String(plan_code))) throw new Error("plan_not_available");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("code,name,audience,active,legacy,monthly_price,yearly_price,stripe_monthly_price_id,stripe_yearly_price_id")
      .eq("code", plan_code).eq("active", true).eq("audience", "contractor").maybeSingle();
    if (planError || !plan || plan.legacy === true) throw new Error("plan_unavailable");
    const cycle = billing_cycle === "yearly" ? "yearly" : "monthly";
    const recurringInterval: "month" | "year" = cycle === "yearly" ? "year" : "month";
    const amountCents = Number(cycle === "yearly" ? plan.yearly_price : plan.monthly_price);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("plan_price_unavailable");
    const publishedPriceId: string | null = cycle === "yearly"
      ? plan.stripe_yearly_price_id : plan.stripe_monthly_price_id;

    // Do not silently bill an obsolete Stripe price. A missing price mapping
    // falls back to Stripe's inline recurring price at the published DB amount.
    let validPriceId: string | null = null;
    if (publishedPriceId) {
      try {
        const published = await stripe.prices.retrieve(publishedPriceId);
        if (published.active && published.livemode === true && published.currency === "cad" &&
            published.unit_amount === amountCents && published.recurring?.interval === recurringInterval) {
          validPriceId = publishedPriceId;
        }
      } catch {
        console.warn("[checkout:plans] price lookup unavailable; using canonical inline price");
      }
    }
    const taxRates = await ensureQuebecTaxRates(stripe);
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = validPriceId
      ? { price: validPriceId, quantity: 1, tax_rates: taxRates }
      : { price_data: {
          currency: "cad",
          unit_amount: amountCents,
          recurring: { interval: recurringInterval },
          product_data: { name: "UNPRO — " + plan.name },
        }, quantity: 1, tax_rates: taxRates };

    // Find or create Stripe customer
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // A LIVE subscription must be correlated to its existing company when
    // possible. Guest checkout stays available, but incomplete identity is
    // explicitly sent to manual reconciliation by the signed webhook.
    let contractorId: string | null = null;
    let contactPhone: string | null = null;
    let companyName: string | null = null;
    if (userId) {
      const { data: owned, error: ownedError } = await supabaseAdmin
        .from("contractors")
        .select("id,business_name,phone,email")
        .eq("user_id", userId).maybeSingle();
      if (ownedError) console.error("[checkout:plans] owner lookup", ownedError.code);
      if (owned) {
        contractorId = owned.id;
        companyName = owned.business_name ?? null;
        contactPhone = owned.phone ?? null;
        if (!userEmail && owned.email) userEmail = owned.email;
      }
    }
    if (onboarding_session_id && userId) {
      const { data: ownedFunnel, error: funnelError } = await supabaseAdmin
        .from("contractor_activation_funnel")
        .select("id,user_id,business_name,phone,email")
        .eq("id", onboarding_session_id).maybeSingle();
      if (funnelError || !ownedFunnel || ownedFunnel.user_id !== userId) {
        return new Response(JSON.stringify({
          code: "onboarding_session_forbidden",
          error: "Impossible de rattacher cette inscription au compte. Reconnectez-vous puis réessayez.",
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      companyName ||= ownedFunnel.business_name ?? null;
      contactPhone ||= ownedFunnel.phone ?? null;
      if (!userEmail && ownedFunnel.email) userEmail = ownedFunnel.email;
    }

    const requestedOrigin = req.headers.get("origin") || "";
    const allowedOrigins = new Set(["https://unpro.ca", "https://www.unpro.ca", "https://sequential-prompt-path.lovable.app"]);
    const origin = allowedOrigins.has(requestedOrigin) ? requestedOrigin : "https://unpro.ca";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : userEmail || undefined,
      line_items: [lineItem],
      mode: "subscription",
      success_url: `${origin}/entrepreneur/activer/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/entrepreneur/onboarding/plan`,
      metadata: {
        plan_code,
        billing_cycle: cycle,
        onboarding_session_id: onboarding_session_id || "",
        user_id: userId || "",
        contractor_id: contractorId || "",
        plan_id: plan.code,
        expected_amount_cents: String(amountCents),
        offer: "contractor_subscription",
      },
      allow_promotion_codes: true,
    };

    // Apply coupon if provided
    if (coupon_code) {
      sessionParams.discounts = [{ coupon: coupon_code }];
      delete sessionParams.allow_promotion_codes;
    }

    // A checkout attempt is not a payment. Keep known contact details for
    // an operator to recover; never store payment card information.
    const audit = (event_type: string, extra: Record<string, unknown> = {}) =>
      supabaseAdmin.from("contractor_funnel_events").insert({
        user_id: userId,
        contractor_id: contractorId,
        email: userEmail,
        phone: contactPhone,
        event_type,
        step: "subscription_checkout",
        environment: "live",
        metadata: {
          plan_code, billing_cycle: cycle,
          expected_amount_cents: amountCents,
          onboarding_session_id: onboarding_session_id ?? null, ...extra,
        },
      });
    await audit("plan_checkout_attempted").then(({ error }) => {
      if (error) console.error("[checkout:plans] audit", error.code);
    });
    let session: Stripe.Checkout.Session;
    try {
      // Never share the idempotency key of two unrelated anonymous buyers.
      const identity = userId || crypto.randomUUID();
      // Coupon changes, attribution and return destination must never inherit
      // a previous checkout created with a different payment contract.
      const contract = JSON.stringify({
        identity, plan_code, cycle, amountCents,
        coupon_code: coupon_code || null,
        onboarding_session_id: onboarding_session_id || null,
        origin, bucket: Math.floor(Date.now() / 1800000),
      });
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(contract));
      const requestKey = "unpro-plan-v2-" + Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, "0")).join("");
      session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey: requestKey });
    } catch (e) {
      await audit("plan_checkout_failed", { failure_reason: "stripe_session_creation_failed" });
      throw e;
    }
    // Stripe is authoritative for whether this unpaid session completes.
    // Never overwrite the same session id when the webhook has already paid it.
    const { error: saveError } = await supabaseAdmin.from("billing_checkout_sessions").insert({
      contractor_id: contractorId,
      stripe_checkout_session_id: session.id,
      amount_total: session.amount_total ?? amountCents,
      currency: session.currency || "cad",
      checkout_status: "open",
      payment_status: "unpaid",
      metadata_json: {
        offer: "contractor_subscription", plan_code, billing_cycle: cycle,
        expected_amount_cents: amountCents, user_id: userId,
        onboarding_session_id: onboarding_session_id || null,
        email: userEmail,
        company_name: companyName,
        contact_phone: contactPhone,
      },
    });
    if (saveError && saveError.code !== "23505") console.error("[checkout:plans] snapshot", saveError.code);
    await audit("plan_checkout_created", { stripe_checkout_session_id: session.id });
    if (!session.url) throw new Error("checkout_url_missing");

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[create-stripe-checkout-session] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
