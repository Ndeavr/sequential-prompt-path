import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Stripe price IDs are now fetched from plan_catalog table (no hardcoded map)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email as string;

    const {
      planId,
      billingInterval,
      successUrl,
      cancelUrl,
      promoCode,
      appointmentPack,
      uiMode,
      returnUrl,
      quoteId,
      displayedPriceCents,
    } = await req.json();
    const interval: "month" | "year" = billingInterval === "year" ? "year" : "month";

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up Stripe price ID from plan_catalog
    const priceColumn = interval === "year" ? "stripe_yearly_price_id" : "stripe_monthly_price_id";
    const { data: planRow, error: planError } = await serviceClient
      .from("plan_catalog")
      .select(`code, name, ${priceColumn}, stripe_product_id`)
      .eq("code", planId)
      .eq("active", true)
      .maybeSingle();

    if (planError || !planRow) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resolvedPriceId = (planRow as any)[priceColumn];
    const planName = (planRow as any).name || (planId.charAt(0).toUpperCase() + planId.slice(1));
    const stripeProductId = (planRow as any).stripe_product_id as string | null;

    // ── PERSONALIZED QUOTE OVERRIDE ──
    // When quoteId is present, the AI-recommended price becomes the single source of truth.
    let personalizedPriceCents: number | null = null;
    let quoteRow: any = null;
    if (quoteId) {
      const { data: q, error: qErr } = await serviceClient
        .from("contractor_pricing_quotes")
        .select("id, recommended_plan, recommended_monthly_price, pricing_status")
        .eq("id", quoteId)
        .maybeSingle();
      if (qErr || !q) {
        return new Response(JSON.stringify({ error: "Devis introuvable", code: "quote_not_found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      quoteRow = q;
      if (q.pricing_status === "waitlisted") {
        return new Response(JSON.stringify({ error: "Ce territoire est en liste d'attente", code: "waitlisted" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (q.recommended_plan !== planId) {
        return new Response(
          JSON.stringify({
            error: "Désaccord plan/devis détecté.",
            code: "pricing_mismatch",
            expected_plan: q.recommended_plan,
            received_plan: planId,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      personalizedPriceCents = Math.round(Number(q.recommended_monthly_price) * 100);

      // Closed-loop validation: client-displayed price must match server-computed quote price
      if (
        typeof displayedPriceCents === "number" &&
        Math.abs(displayedPriceCents - personalizedPriceCents) > 1
      ) {
        console.error("[pricing_mismatch]", {
          quoteId,
          displayedPriceCents,
          personalizedPriceCents,
          planId,
        });
        try {
          await serviceClient.from("acquisition_events").insert({
            event_type: "pricing_mismatch",
            metadata: {
              quote_id: quoteId,
              plan_id: planId,
              displayed: displayedPriceCents,
              server: personalizedPriceCents,
            },
          });
        } catch { /* table optional */ }
        return new Response(
          JSON.stringify({
            error: "Désaccord de prix détecté entre l'écran et le serveur.",
            code: "pricing_mismatch",
            displayed_cents: displayedPriceCents,
            server_cents: personalizedPriceCents,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Require a Stripe price ID only when we are NOT overriding with a personalized quote
    if (!personalizedPriceCents && !resolvedPriceId) {
      return new Response(JSON.stringify({ error: "Price not configured for this plan/interval" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create contractor
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
      if (insertErr || !newContractor) {
        return new Response(
          JSON.stringify({ error: "Could not create contractor profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      contractor = newContractor;
    }

    // ── PROMO CODE VALIDATION ──
    let promoResult: any = null;
    let redemptionId: string | null = null;
    let isZeroTotal = false;

    if (promoCode && promoCode.trim()) {
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

      if (reserveError) {
        console.error("Promo reservation error:", reserveError);
        return new Response(
          JSON.stringify({ error: "Erreur de validation du code promo" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      promoResult = reserveResult;

      if (!promoResult.ok) {
        const reasonMap: Record<string, string> = {
          invalid_or_inactive_code: "Code promo invalide ou expiré",
          max_redemptions_reached: `Limite d'utilisation atteinte (${promoResult.used_count}/${promoResult.max_allowed})`,
          global_limit_reached: "Ce code promo n'est plus disponible",
        };
        return new Response(
          JSON.stringify({
            error: reasonMap[promoResult.reason] || promoResult.reason,
            reason: promoResult.reason,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check plan eligibility
      if (
        promoResult.eligible_plan_codes &&
        Array.isArray(promoResult.eligible_plan_codes) &&
        !promoResult.eligible_plan_codes.includes(planId)
      ) {
        // Reverse reservation
        await serviceClient
          .from("promo_code_redemptions")
          .update({ status: "rejected" })
          .eq("id", promoResult.redemption_id);

        return new Response(
          JSON.stringify({ error: `Ce code n'est pas valide pour le plan ${planId}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      redemptionId = promoResult.redemption_id;

      // Check if 100% discount = zero total
      if (promoResult.discount_type === "percentage" && promoResult.discount_value >= 100) {
        isZeroTotal = true;
      }
    }

    // ── ZERO-TOTAL ACTIVATION (no Stripe needed) ──
    if (isZeroTotal) {
      // Create checkout session record
      const { data: checkoutRecord } = await serviceClient
        .from("checkout_sessions")
        .insert({
          contractor_profile_id: contractor.id,
          selected_plan_code: planId,
          selected_plan_name: planId.charAt(0).toUpperCase() + planId.slice(1),
          billing_cycle: interval === "year" ? "yearly" : "monthly",
          base_price: 0,
          subtotal_before_discount: 0,
          promo_code: promoCode?.toUpperCase(),
          promo_code_type: "freeone",
          discount_type: promoResult.discount_type,
          discount_value: promoResult.discount_value,
          discount_amount: 0,
          taxable_amount: 0,
          tax_amount: 0,
          final_total_after_discount: 0,
          checkout_status: "completed_free",
          zero_dollar_activation: true,
          card_required: false,
          adaptive_pricing_enabled: false,
          promo_redemption_id: redemptionId,
        })
        .select("id")
        .single();

      // Mark promo as consumed
      if (redemptionId) {
        await serviceClient
          .from("promo_code_redemptions")
          .update({ status: "consumed", checkout_session_id: checkoutRecord?.id })
          .eq("id", redemptionId);
      }

      // Activate contractor
      await serviceClient
        .from("contractors")
        .update({
          status: "active",
          subscription_plan: planId,
        })
        .eq("id", contractor.id);

      // Create subscription record
      await serviceClient.from("contractor_subscriptions").upsert(
        {
          contractor_id: contractor.id,
          plan_id: planId,
          billing_interval: interval,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(
            Date.now() + (interval === "year" ? 365 : 30) * 86400000
          ).toISOString(),
        },
        { onConflict: "contractor_id" }
      );

      return new Response(
        JSON.stringify({
          activated: true,
          zero_total: true,
          checkout_id: checkoutRecord?.id,
          message: "Votre plan a été activé gratuitement!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── STRIPE CHECKOUT (paid flow) ──
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get or create Stripe customer
    const { data: existingSub } = await serviceClient
      .from("contractor_subscriptions")
      .select("stripe_customer_id")
      .eq("contractor_id", contractor.id)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { contractor_id: contractor.id, user_id: userId },
      });
      customerId = customer.id;
    }

    // Build line items
    const lineItems: any[] = [{ price: resolvedPriceId, quantity: 1 }];

    // Add one-time appointment pack if present
    if (appointmentPack && appointmentPack.totalPriceCents > 0) {
      lineItems.push({
        price_data: {
          currency: "cad",
          product_data: {
            name: `${appointmentPack.size} rendez-vous à la carte`,
            metadata: { type: "appointment_pack", size: String(appointmentPack.size) },
          },
          unit_amount: appointmentPack.totalPriceCents,
        },
        quantity: 1,
      });
    }

    // Build checkout config
    const isEmbedded = uiMode === "embedded";
    const checkoutConfig: any = {
      customer: customerId,
      mode: "subscription",
      locale: "fr",
      line_items: lineItems,
      metadata: {
        contractor_id: contractor.id,
        plan_id: planId,
        billing_interval: interval,
        ...(quoteId && { quote_id: String(quoteId) }),
        ...(redemptionId && { redemption_id: redemptionId }),
        ...(promoCode && { promo_code: promoCode.toUpperCase() }),
        ...(appointmentPack && {
          appointment_pack_size: String(appointmentPack.size),
          appointment_pack_total_cents: String(appointmentPack.totalPriceCents),
        }),
      },
      subscription_data: {
        metadata: {
          contractor_id: contractor.id,
          plan_id: planId,
          billing_interval: interval,
          ...(quoteId && { quote_id: String(quoteId) }),
        },
      },
    };

    if (isEmbedded) {
      checkoutConfig.ui_mode = "embedded";
      checkoutConfig.return_url = returnUrl || `${req.headers.get("origin")}/pro/onboarding?plan=${planId}&checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    } else {
      checkoutConfig.success_url = successUrl || `${req.headers.get("origin")}/pro/billing?success=true`;
      checkoutConfig.cancel_url = cancelUrl || `${req.headers.get("origin")}/pro/billing?canceled=true`;
    }

    // Add Stripe coupon for promo (if partial discount, not zero-total)
    if (promoResult?.ok && !isZeroTotal) {
      // Create a one-time Stripe coupon for this promo
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
        checkoutConfig.discounts = [{ coupon: coupon.id }];
      } catch (couponErr) {
        console.error("Coupon creation failed, proceeding without discount:", couponErr);
      }
    }

    const session = await stripe.checkout.sessions.create(checkoutConfig);

    // Create checkout_sessions record
    await serviceClient.from("checkout_sessions").insert({
      contractor_profile_id: contractor.id,
      selected_plan_code: planId,
      selected_plan_name: planId.charAt(0).toUpperCase() + planId.slice(1),
      billing_cycle: interval === "year" ? "yearly" : "monthly",
      external_checkout_id: session.id,
      stripe_customer_id: customerId,
      promo_code: promoCode?.toUpperCase() || null,
      promo_redemption_id: redemptionId,
      checkout_status: "pending",
      payment_provider: "stripe",
      adaptive_pricing_enabled: false,
    });

    if (isEmbedded) {
      if (!session.client_secret) {
        console.error("Stripe returned no client_secret for embedded session", session.id);
        return new Response(
          JSON.stringify({ error: "Stripe n'a pas retourné de secret de paiement. Réessayez." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Checkout error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
