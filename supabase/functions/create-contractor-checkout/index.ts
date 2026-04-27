/**
 * create-contractor-checkout — Stripe Checkout for contractor plans.
 *
 * Source of truth: src/config/contractorPlans.ts
 *  - Recurring monthly: recrue $149, pro $349, premium $599, elite $999, signature $1799
 *  - One-time founder lifetime: founder_elite_10y $19995, founder_signature_10y $29995
 *
 * Reads existing Stripe price IDs from `plan_catalog` (per the dynamic
 * pricing memory). Falls back to creating an inline price on the fly only if missing,
 * so a fresh project still works end-to-end.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PlanCode =
  | "recrue" | "pro" | "premium" | "elite" | "signature"
  | "founder_elite_10y" | "founder_signature_10y";

interface PlanDef {
  name: string;
  amount: number; // cents CAD
  recurring: boolean;
}

const PLANS: Record<PlanCode, PlanDef> = {
  recrue:                { name: "UNPRO Recrue",              amount: 14900,   recurring: true  },
  pro:                   { name: "UNPRO Pro",                 amount: 34900,   recurring: true  },
  premium:               { name: "UNPRO Premium",             amount: 59900,   recurring: true  },
  elite:                 { name: "UNPRO Élite",               amount: 99900,   recurring: true  },
  signature:             { name: "UNPRO Signature",           amount: 179900,  recurring: true  },
  founder_elite_10y:     { name: "UNPRO Élite Fondateur 10 ans",     amount: 1999500, recurring: false },
  founder_signature_10y: { name: "UNPRO Signature Fondateur 10 ans", amount: 2999500, recurring: false },
};

function logStep(step: string, details?: any) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CONTRACTOR-CHECKOUT] ${step}${detailsStr}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const body = await req.json().catch(() => ({}));
    const planCode = body?.plan_code as PlanCode | undefined;
    if (!planCode || !PLANS[planCode]) {
      return new Response(
        JSON.stringify({ error: `Plan inconnu : ${planCode}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const plan = PLANS[planCode];
    logStep("Plan resolved", { planCode, amount: plan.amount, recurring: plan.recurring });

    // Auth — optional (guests redirected to auth on the front end usually,
    // but we still allow guest checkout via Stripe email entry).
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    let userEmail: string | undefined;
    let userId: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseAuth.auth.getUser(token);
      userEmail = data?.user?.email ?? undefined;
      userId = data?.user?.id ?? undefined;
      logStep("User authenticated", { userId, userEmail });
    } else {
      logStep("Guest checkout (no auth)");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Try to find existing Stripe price via plan_catalog table (best-effort).
    let priceId: string | undefined;
    try {
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data: catalogRow } = await supabaseService
        .from("plan_catalog")
        .select("stripe_price_id_monthly, stripe_price_id_one_time")
        .eq("code", planCode)
        .maybeSingle();
      priceId = plan.recurring
        ? catalogRow?.stripe_price_id_monthly
        : catalogRow?.stripe_price_id_one_time;
      if (priceId) logStep("Found Stripe price in plan_catalog", { priceId });
    } catch (e) {
      logStep("plan_catalog lookup skipped", { error: (e as Error).message });
    }

    // Reuse customer if email known
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Reusing Stripe customer", { customerId });
      }
    }

    const origin = req.headers.get("origin") || "https://unpro.ca";
    const successUrl = `${origin}/entrepreneur/onboarding?step=post_payment&plan=${planCode}`;
    const cancelUrl = `${origin}/?alex=resume&plan=${planCode}`;

    // Build line items: prefer existing price_id, otherwise inline price_data.
    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = priceId
      ? { price: priceId, quantity: 1 }
      : {
          price_data: {
            currency: "cad",
            product_data: { name: plan.name },
            unit_amount: plan.amount,
            ...(plan.recurring ? { recurring: { interval: "month" } } : {}),
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      mode: plan.recurring ? "subscription" : "payment",
      line_items: [lineItem],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        plan_code: planCode,
        user_id: userId ?? "guest",
        source: "alex_chat_contractor_onboarding",
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, plan_code: planCode }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
