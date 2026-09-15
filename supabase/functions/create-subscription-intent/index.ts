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
      .select("code, name, billing_mode, monthly_price, annual_price, stripe_monthly_price_id, stripe_yearly_price_id, stripe_one_time_price_id")
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

      // ── Zero-total activation (100 % promo, e.g. NICK) ──────────────────
      // This is a REAL production contractor activation. Not a trial, not a
      // test account. UNPRO simply covers 100 % of the plan price.
      // Fully idempotent: replaying it never duplicates anything.
      if (promoResult.discount_type === "percentage" && Number(promoResult.discount_value) >= 100) {
        const normalizedPromo = String(promoCode).trim().toUpperCase();
        const originalPrice = Number(
          interval === "year"
            ? (planRow as any).annual_price ?? 0
            : (planRow as any).monthly_price ?? 0,
        );
        const nowIso = new Date().toISOString();
        const periodEnd = new Date(
          Date.now() + (interval === "year" ? 365 : 30) * 86400000,
        ).toISOString();

        // Real contractor columns only. `status` / `subscription_plan` do NOT
        // exist on public.contractors — the previous write failed silently and
        // reported a success that never happened.
        const { error: activateErr } = await serviceClient
          .from("contractors")
          .update({
            account_status: "active",
            activation_status: "activated",
            updated_at: nowIso,
          })
          .eq("id", contractor.id);

        if (activateErr) {
          console.error("[create-subscription-intent] zero-total activation failed", {
            contractor_id: contractor.id,
            plan: planCode,
            error: activateErr.message,
          });
          return json(
            {
              error: "L'activation n'a pas pu être complétée. Aucun paiement n'a été créé.",
              code: "zero_total_activation_failed",
            },
            500,
          );
        }

        // Existing subscription for this contractor (idempotency subject)
        const { data: priorSub } = await serviceClient
          .from("contractor_subscriptions")
          .select("id, plan_id, status")
          .eq("contractor_id", contractor.id)
          .maybeSingle();

        const alreadyActive =
          priorSub?.status === "active" && priorSub?.plan_id === planCode;

        const { error: subErr } = await serviceClient
          .from("contractor_subscriptions")
          .upsert(
            {
              contractor_id: contractor.id,
              plan_id: planCode,
              billing_interval: interval,
              status: "active",
              payment_status: "paid",
              payment_method: "promo_code",
              amount_paid_cents: 0,
              currency: "cad",
              plan_source: "promo_code",
              activation_source: `promo:${normalizedPromo}`,
              activation_note: `Forfait couvert à 100 % par le code ${normalizedPromo}`,
              auto_renew: true,
              activated_by: userId,
              current_period_start: nowIso,
              current_period_end: periodEnd,
              updated_at: nowIso,
            },
            { onConflict: "contractor_id" },
          );

        if (subErr) {
          console.error("[create-subscription-intent] subscription write failed", {
            contractor_id: contractor.id,
            error: subErr.message,
          });
          return json(
            {
              error: "L'activation n'a pas pu être enregistrée. Réessayez dans un instant.",
              code: "zero_total_subscription_failed",
            },
            500,
          );
        }

        const auditMeta = {
          contractor_id: contractor.id,
          plan_code: planCode,
          billing_interval: interval,
          original_price_cents: originalPrice,
          final_price_cents: 0,
          promo_code: normalizedPromo,
          discount_percent: 100,
          activated_at: nowIso,
          account_mode: "production",
        };

        // Durable trail — never labelled as a test activation.
        const [{ error: ledgerErr }, { error: auditErr }, { error: eventErr }] =
          await Promise.all([
            serviceClient.from("contractor_activation_ledger").insert({
              contractor_id: contractor.id,
              action: "contractor_plan_activated_with_promo",
              source: "create-subscription-intent",
              actor_id: userId,
              plan_id: planCode,
              before_state: { subscription_status: priorSub?.status ?? null, plan_id: priorSub?.plan_id ?? null },
              after_state: { subscription_status: "active", plan_id: planCode },
              metadata: auditMeta,
            }),
            serviceClient.from("unpro_payment_activation_audit").insert({
              contractor_id: contractor.id,
              action: "contractor_plan_activated_with_promo",
              previous_status: priorSub?.status ?? null,
              new_status: "active",
              amount_cents: 0,
              currency: "cad",
              source: "promo_code",
              result: "activated",
              metadata: auditMeta,
            }),
            serviceClient.from("contractor_activation_events").insert({
              contractor_id: contractor.id,
              event_type: "contractor_plan_activated_with_promo",
              event_label: `Forfait ${planRow.name} activé avec le code ${normalizedPromo}`,
              payload: auditMeta,
            }),
          ]);

        if (ledgerErr || auditErr || eventErr) {
          // The activation itself succeeded — surface the trail failure loudly
          // instead of swallowing it, but do not fail the contractor.
          console.error("[create-subscription-intent] activation trail incomplete", {
            contractor_id: contractor.id,
            ledger: ledgerErr?.message ?? null,
            audit: auditErr?.message ?? null,
            event: eventErr?.message ?? null,
          });
        }

        if (redemptionId) {
          const { error: redeemErr } = await serviceClient
            .from("promo_code_redemptions")
            .update({ status: "consumed" })
            .eq("id", redemptionId);
          if (redeemErr) {
            console.error("[create-subscription-intent] redemption consume failed", redeemErr.message);
          }
        }

        return json({
          activated: true,
          zero_total: true,
          already_active: alreadyActive,
          plan_code: planCode,
          plan_name: planRow.name,
          promo_code: normalizedPromo,
          original_price_cents: originalPrice,
          final_price_cents: 0,
          message: `Votre forfait est entièrement offert grâce au code ${normalizedPromo}.`,
        });
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
