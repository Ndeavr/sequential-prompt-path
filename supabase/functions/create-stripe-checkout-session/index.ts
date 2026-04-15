import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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

    // Plan pricing map (price IDs from Stripe)
    const planPrices: Record<string, { monthly: string; yearly: string; name: string }> = {
      pro: {
        monthly: "price_pro_monthly",
        yearly: "price_pro_yearly",
        name: "UNPRO Pro",
      },
      premium: {
        monthly: "price_premium_monthly",
        yearly: "price_premium_yearly",
        name: "UNPRO Premium",
      },
      elite: {
        monthly: "price_elite_monthly",
        yearly: "price_elite_yearly",
        name: "UNPRO Élite",
      },
      signature: {
        monthly: "price_signature_monthly",
        yearly: "price_signature_yearly",
        name: "UNPRO Signature",
      },
      fondateur: {
        monthly: "price_fondateur_monthly",
        yearly: "price_fondateur_yearly",
        name: "UNPRO Fondateur",
      },
    };

    const plan = planPrices[plan_code];
    if (!plan) throw new Error(`Unknown plan: ${plan_code}`);

    const cycle = billing_cycle === "yearly" ? "yearly" : "monthly";
    const priceId = plan[cycle];

    // Find or create Stripe customer
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const origin = req.headers.get("origin") || "https://sequential-prompt-path.lovable.app";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : userEmail || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/entrepreneur/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/entrepreneur/onboarding/plan`,
      metadata: {
        plan_code,
        billing_cycle: cycle,
        onboarding_session_id: onboarding_session_id || "",
        user_id: userId || "",
      },
      allow_promotion_codes: true,
    };

    // Apply coupon if provided
    if (coupon_code) {
      sessionParams.discounts = [{ coupon: coupon_code }];
      delete sessionParams.allow_promotion_codes;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Save checkout session to DB
    if (onboarding_session_id) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabaseAdmin.from("contractor_checkout_sessions").insert({
        onboarding_session_id,
        stripe_checkout_id: session.id,
        selected_plan: plan_code,
        billing_cycle: cycle,
        coupon_code: coupon_code || null,
        checkout_status: "created",
        amount_total: session.amount_total,
      });
    }

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
