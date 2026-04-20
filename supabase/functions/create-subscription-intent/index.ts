/**
 * UNPRO — create-subscription-intent
 * Creates an incomplete Stripe subscription and returns the client_secret
 * for use with Stripe Payment Element (not Embedded Checkout).
 */
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = user.id;
    const userEmail = user.email as string;

    const { planCode, billingInterval, promoCode } = await req.json();
    const interval: "month" | "year" = billingInterval === "year" ? "year" : "month";

    if (!planCode) return json({ error: "planCode required" }, 400);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // 1. Fetch plan from catalog (full row — UNPRO is the pricing brain)
    const { data: planRow, error: planError } = await serviceClient
      .from("plan_catalog")
      .select("code, name, billing_mode, stripe_monthly_price_id, stripe_yearly_price_id, stripe_one_time_price_id")
      .eq("code", planCode)
      .eq("active", true)
      .maybeSingle();

    if (planError || !planRow) return json({ error: "Plan introuvable" }, 404);

    // Route one-time plans (Founder) to dedicated checkout flow
    const isOneTime = (planRow as any).billing_mode === "one_time";
    if (isOneTime) {
      return json({
        error: "ROUTE_ONE_TIME",
        redirect_function: "create-founder-checkout",
        plan_code: planCode,
      }, 400);
    }

    const priceColumn = interval === "year" ? "stripe_yearly_price_id" : "stripe_monthly_price_id";
    const resolvedPriceId = (planRow as any)[priceColumn];
    if (!resolvedPriceId) return json({ error: "Prix non configuré pour ce plan/intervalle" }, 400);

    // 2. Get or create contractor
    let { data: contractor } = await serviceClient
      .from("contractors")
      .select("id, email, phone")
      .eq("user_id", userId)
      .maybeSingle();

    if (!contractor) {
      const { data: newContractor, error: insertErr } = await serviceClient
        .from("contractors")
        .insert({ user_id: userId, business_name: userEmail })
        .select("id, email, phone")
        .single();
      if (insertErr || !newContractor) return json({ error: "Impossible de créer le profil" }, 500);
      contractor = newContractor;
    }

    // 3. Promo code validation
    let promoResult: any = null;
    let redemptionId: string | null = null;

    if (promoCode?.trim()) {
      const normalizedEmail = userEmail?.toLowerCase().trim() || null;
      const normalizedPhone = contractor.phone?.replace(/\D/g, "") || null;

      const { data: reserveResult, error: reserveError } = await serviceClient.rpc(
        "reserve_promo_code_redemption",
        {
          p_code: promoCode.trim(),
          p_user_id: userId,
          p_contractor_id: contractor.id,
          p_normalized_email: normalizedEmail,
          p_normalized_phone: normalizedPhone,
        }
      );

      if (reserveError) return json({ error: "Erreur de validation du code promo" }, 400);

      promoResult = reserveResult;
      if (!promoResult.ok) {
        return json({ error: promoResult.reason || "Code invalide", reason: promoResult.reason }, 400);
      }

      // Plan eligibility
      if (
        promoResult.eligible_plan_codes &&
        Array.isArray(promoResult.eligible_plan_codes) &&
        !promoResult.eligible_plan_codes.includes(planCode)
      ) {
        await serviceClient
          .from("promo_code_redemptions")
          .update({ status: "rejected" })
          .eq("id", promoResult.redemption_id);
        return json({ error: `Ce code n'est pas valide pour le plan ${planCode}` }, 400);
      }

      redemptionId = promoResult.redemption_id;

      // Zero-total activation
      if (promoResult.discount_type === "percentage" && promoResult.discount_value >= 100) {
        // Handle free activation (same as create-checkout-session)
        await serviceClient.from("contractors").update({
          status: "active",
          subscription_plan: planCode,
        }).eq("id", contractor.id);

        await serviceClient.from("contractor_subscriptions").upsert({
          contractor_id: contractor.id,
          plan_id: planCode,
          billing_interval: interval,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (interval === "year" ? 365 : 30) * 86400000).toISOString(),
        }, { onConflict: "contractor_id" });

        if (redemptionId) {
          await serviceClient.from("promo_code_redemptions")
            .update({ status: "consumed" })
            .eq("id", redemptionId);
        }

        return json({ activated: true, zero_total: true, message: "Plan activé gratuitement !" });
      }
    }

    // 4. Get or create Stripe customer
    const { data: existingSub } = await serviceClient
      .from("contractor_subscriptions")
      .select("stripe_customer_id")
      .eq("contractor_id", contractor.id)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id;

    // Default address required by Stripe automatic_tax (QC-based product)
    const defaultAddress = {
      country: "CA",
      state: "QC",
      city: contractor.city || "Montréal",
      postal_code: contractor.postal_code || "H2X 1Y4",
      line1: contractor.address_line1 || "Adresse à compléter",
    };

    if (!customerId) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          address: defaultAddress,
          metadata: { contractor_id: contractor.id, user_id: userId },
        });
        customerId = customer.id;
      }
    }

    // Ensure existing customer has an address (required for automatic_tax)
    try {
      const existing = await stripe.customers.retrieve(customerId);
      if (!existing.deleted && (!existing.address || !existing.address.country)) {
        await stripe.customers.update(customerId, { address: defaultAddress });
      }
    } catch (e) {
      console.warn("[create-subscription-intent] customer address check failed", e);
    }

    // 5. Build subscription with payment_behavior: default_incomplete + automatic tax (QC-compliant)
    const subParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: resolvedPriceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      automatic_tax: { enabled: true },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        contractor_id: contractor.id,
        plan_id: planCode,
        billing_interval: interval,
        ...(redemptionId && { redemption_id: redemptionId }),
        ...(promoCode && { promo_code: promoCode.toUpperCase() }),
      },
    };

    // Apply Stripe coupon if promo
    if (promoResult?.ok) {
      try {
        const couponParams: any = {
          duration: "once",
          metadata: { promo_code: promoCode, redemption_id: redemptionId },
        };
        if (promoResult.discount_type === "percentage") {
          couponParams.percent_off = Math.min(promoResult.discount_value, 100);
        } else {
          couponParams.amount_off = promoResult.discount_value;
          couponParams.currency = "cad";
        }
        const coupon = await stripe.coupons.create(couponParams);
        subParams.coupon = coupon.id;
      } catch (e) {
        console.error("Coupon creation failed:", e);
      }
    }

    console.log("Creating subscription...");
    const subscription = await stripe.subscriptions.create(subParams);
    console.log("Subscription created:", subscription.id, "status:", subscription.status);

    // Extract client_secret from the expanded latest_invoice.payment_intent
    const latestInvoice = subscription.latest_invoice as any;
    console.log("latest_invoice type:", typeof latestInvoice, "id:", latestInvoice?.id || latestInvoice);

    let clientSecret: string | null = null;

    if (latestInvoice && typeof latestInvoice === "object") {
      const pi = latestInvoice.payment_intent;
      console.log("PI from expanded invoice:", typeof pi, pi?.id || pi);

      if (typeof pi === "string") {
        // payment_intent wasn't expanded — retrieve it
        const paymentIntent = await stripe.paymentIntents.retrieve(pi);
        clientSecret = paymentIntent.client_secret;
      } else if (pi && pi.client_secret) {
        clientSecret = pi.client_secret;
      }
    } else if (typeof latestInvoice === "string") {
      // latest_invoice wasn't expanded — retrieve invoice + PI
      const invoice = await stripe.invoices.retrieve(latestInvoice, {
        expand: ["payment_intent"],
      });
      const pi = invoice.payment_intent as any;
      if (typeof pi === "string") {
        const paymentIntent = await stripe.paymentIntents.retrieve(pi);
        clientSecret = paymentIntent.client_secret;
      } else if (pi && pi.client_secret) {
        clientSecret = pi.client_secret;
      }
    }

    console.log("clientSecret present:", !!clientSecret);

    if (!clientSecret) {
      // Last resort: list payment intents for this customer
      const pis = await stripe.paymentIntents.list({ customer: customerId, limit: 1 });
      if (pis.data.length > 0 && pis.data[0].client_secret) {
        clientSecret = pis.data[0].client_secret;
        console.log("Recovered clientSecret from PI list");
      }
    }

    if (!clientSecret) {
      console.error("No client_secret found. Subscription:", subscription.id, "Status:", subscription.status);
      return json({ error: "Impossible d'obtenir le secret de paiement. Veuillez réessayer." }, 500);
    }

    return json({
      subscriptionId: subscription.id,
      clientSecret,
      customerId,
    });
  } catch (error: unknown) {
    console.error("create-subscription-intent error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return json({ error: msg }, 500);
  }
});
