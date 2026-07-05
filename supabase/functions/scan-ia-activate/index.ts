// scan-ia-activate — Checkout Stripe $1 / 7 jours (Activation IA)
// Public : ne requiert pas de compte. Crée une Checkout Session Stripe
// avec price_data inline (pas de dépendance sur plan_catalog).

import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const { report_id, session_token, email, business_name } = await req.json();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") ?? "https://unpro.ca";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: 100,
            product_data: {
              name: "Activation IA UNPRO — 7 jours",
              description:
                "Profil IA, territoires, catégories, vérification conformité, apparition dans Alex, réception de rendez-vous.",
            },
          },
        },
      ],
      metadata: {
        source: "scan_ia_activation",
        report_id: String(report_id ?? ""),
        session_token: String(session_token ?? ""),
        business_name: String(business_name ?? ""),
      },
      success_url: `${origin}/scan-ia/activation-success?st=${encodeURIComponent(session_token ?? "")}&cs={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/scan-ia/rapport?st=${encodeURIComponent(session_token ?? "")}`,
    });

    return new Response(JSON.stringify({ success: true, url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-ia-activate error:", e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
