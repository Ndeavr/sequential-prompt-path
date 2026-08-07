// Concierge — generate a personalized Stripe checkout link for a custom activation offer.
// Uses Stripe directly with price_data so price overrides work.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CANONICAL PRICING — recurring plan amounts come from `public.plans`.
// See _shared/planCatalog.ts. Only the one-time Founder offers, which are not
// part of the recurring catalog, remain declared here.
import { resolvePlan, planLineItem, planMetadata, planErrorResponse } from "../_shared/planCatalog.ts";

const FOUNDER_ONE_TIME: Record<string, { amount: number; label: string }> = {
  founder_elite: { amount: 1999500, label: "UNPRO Founder Élite" },
  founder_signature: { amount: 2999500, label: "UNPRO Founder Signature" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prospect_id, plan, price_override_cad } = await req.json();
    if (!prospect_id || !plan) {
      return new Response(JSON.stringify({ error: "invalid plan or prospect" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const founder = FOUNDER_ONE_TIME[String(plan)];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: p } = await supabase.from("contractor_prospects").select("*").eq("id", prospect_id).maybeSingle();
    if (!p) {
      return new Response(JSON.stringify({ error: "prospect not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") ?? "https://unpro.ca";
    const hasOverride = price_override_cad != null;

    let canonical: Awaited<ReturnType<typeof resolvePlan>> | null = null;
    if (!founder) {
      try {
        canonical = await resolvePlan(supabase, plan);
      } catch (e) {
        return planErrorResponse(e, corsHeaders);
      }
    }

    const label = founder?.label ?? canonical!.name;
    const baseAmount = founder?.amount ?? canonical!.monthlyPrice;
    const amount = hasOverride ? Math.round(Number(price_override_cad) * 100) : baseAmount;
    const recurring = !founder;

    // Standard price → use the canonical Stripe price ID so the charge can never
    // drift from the catalog. Concierge override → inline price_data (intentional).
    const lineItem = !hasOverride && canonical
      ? planLineItem(canonical, "month")
      : {
          price_data: {
            currency: "cad",
            product_data: {
              name: `${label} · Activation concierge`,
              description: `Activation IA + rendez-vous exclusifs pour ${p.business_name}${p.city ? ` (${p.city})` : ""}`,
            },
            unit_amount: amount,
            ...(recurring ? { recurring: { interval: "month" as const } } : {}),
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      mode: recurring ? "subscription" : "payment",
      customer_email: p.email ?? undefined,
      line_items: [lineItem as any],
      metadata: canonical
        ? planMetadata(canonical, {
            prospect_id,
            concierge: "true",
            override: hasOverride ? "yes" : "no",
            charged_amount_cents: String(amount),
          })
        : {
            prospect_id,
            plan_code: String(plan),
            plan_name: label,
            concierge: "true",
            override: hasOverride ? "yes" : "no",
            charged_amount_cents: String(amount),
          },
      success_url: `${origin}/entrepreneur/activer/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });

    return new Response(JSON.stringify({ checkout_url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
