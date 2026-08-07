/**
 * create-contractor-checkout — Stripe Checkout for contractor plans.
 *
 * CANONICAL PRICING: `public.plans` via ../_shared/planCatalog.ts.
 * Legacy codes (recrue|elite|signature) are resolved to their canonical
 * successors (presence|premium|domination).
 *
 * There is deliberately NO inline price fallback for recurring plans: a missing
 * Stripe price ID must fail loudly instead of charging a stale hardcoded amount.
 * (Root cause of the "UI $299 / Stripe $349" defect.)
 *
 * Only the one-time Founder lifetime offers, absent from the recurring catalog,
 * are declared locally.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  resolvePlan, planLineItem, planMetadata, planErrorResponse, canonicalPlanCode,
} from "../_shared/planCatalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FOUNDER_ONE_TIME: Record<string, { name: string; amount: number }> = {
  founder_elite_10y:     { name: "UNPRO Élite Fondateur 10 ans",     amount: 1999500 },
  founder_signature_10y: { name: "UNPRO Signature Fondateur 10 ans", amount: 2999500 },
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
    const requestedCode = String(body?.plan_code ?? "").trim().toLowerCase();
    if (!requestedCode) {
      return new Response(
        JSON.stringify({ error: "Plan manquant.", error_code: "plan_code_missing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const founder = FOUNDER_ONE_TIME[requestedCode];
    let canonical: Awaited<ReturnType<typeof resolvePlan>> | null = null;
    if (!founder) {
      try {
        canonical = await resolvePlan(supabaseService, requestedCode);
      } catch (e) {
        logStep("Plan resolution failed", { requestedCode, error: String(e) });
        return planErrorResponse(e, corsHeaders);
      }
    }

    const planCode = founder ? requestedCode : canonical!.code;
    const planName = founder ? founder.name : canonical!.name;
    const planAmount = founder ? founder.amount : canonical!.monthlyPrice;
    const recurring = !founder;

    // GUARDRAIL — Un plan Fondateur ne peut JAMAIS être une réduction surprise.
    // Tout code "founder_*" doit être one-time (paiement unique 10 ans).
    if (requestedCode.startsWith("founder_") && recurring) {
      return new Response(
        JSON.stringify({ error: "Les plans Fondateurs sont en paiement unique uniquement." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    logStep("Plan resolved", {
      requestedCode,
      planCode,
      canonicalized: canonicalPlanCode(requestedCode),
      amount: planAmount,
      recurring,
    });

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

    // Recurring plans MUST use the catalog Stripe price ID (no inline amount that
    // can drift from the UI). One-time Founder offers use inline price_data.
    let lineItem: Stripe.Checkout.SessionCreateParams.LineItem;
    if (canonical) {
      try {
        lineItem = planLineItem(canonical, "month");
      } catch (e) {
        logStep("Stripe price missing", { planCode, error: String(e) });
        return planErrorResponse(e, corsHeaders);
      }
    } else {
      lineItem = {
        price_data: {
          currency: "cad",
          product_data: { name: planName },
          unit_amount: planAmount,
        },
        quantity: 1,
      };
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      mode: recurring ? "subscription" : "payment",
      line_items: [lineItem],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: canonical
        ? planMetadata(canonical, {
            user_id: userId ?? "guest",
            source: "alex_chat_contractor_onboarding",
          })
        : {
            plan_code: planCode,
            plan_name: planName,
            plan_amount_cents: String(planAmount),
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
