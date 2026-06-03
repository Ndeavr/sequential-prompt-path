// Concierge — generate a personalized Stripe checkout link for a custom activation offer.
// Uses Stripe directly with price_data so price overrides work.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_PRICES_CAD: Record<string, { amount: number; interval: "month" | null; label: string }> = {
  recrue: { amount: 14900, interval: "month", label: "UNPRO Recrue" },
  pro: { amount: 34900, interval: "month", label: "UNPRO Pro" },
  premium: { amount: 59900, interval: "month", label: "UNPRO Premium" },
  elite: { amount: 99900, interval: "month", label: "UNPRO Élite" },
  signature: { amount: 179900, interval: "month", label: "UNPRO Signature" },
  founder_elite: { amount: 1999500, interval: null, label: "UNPRO Founder Élite" },
  founder_signature: { amount: 2999500, interval: null, label: "UNPRO Founder Signature" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prospect_id, plan, price_override_cad } = await req.json();
    const cfg = BASE_PRICES_CAD[plan];
    if (!prospect_id || !cfg) {
      return new Response(JSON.stringify({ error: "invalid plan or prospect" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    const amount = price_override_cad != null ? Math.round(price_override_cad * 100) : cfg.amount;
    const origin = req.headers.get("origin") ?? "https://unpro.ca";

    const session = await stripe.checkout.sessions.create({
      mode: cfg.interval ? "subscription" : "payment",
      customer_email: p.email ?? undefined,
      line_items: [{
        price_data: {
          currency: "cad",
          product_data: {
            name: `${cfg.label} · Activation concierge`,
            description: `Activation IA + rendez-vous exclusifs pour ${p.business_name}${p.city ? ` (${p.city})` : ""}`,
          },
          unit_amount: amount,
          ...(cfg.interval ? { recurring: { interval: cfg.interval } } : {}),
        },
        quantity: 1,
      }],
      metadata: {
        prospect_id,
        plan,
        concierge: "true",
        override: price_override_cad ? "yes" : "no",
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
