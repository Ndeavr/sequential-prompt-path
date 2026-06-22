// UNPRO — Claim Pre-Built Profile $1 Activation
// Creates a Stripe one-time $1 checkout for a contractor claiming their
// pre-built UNPRO profile. Guest-friendly (no auth). Captures email + intent
// metadata. Account + magic-link are created post-payment by the existing
// activation-confirm webhook flow (or follow-up edge function).
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const slug = String(body.slug ?? "").trim();
    const businessName = String(body.business_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const jobsPerMonth = Number(body.jobs_per_month ?? 0);
    const avgTicketK = Number(body.avg_ticket_k ?? 0);

    if (!slug) throw new Error("slug required");
    if (!email || !email.includes("@")) throw new Error("valid email required");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const origin =
      req.headers.get("origin") ||
      `https://${req.headers.get("host") ?? "unpro.ca"}`;

    // Best-effort log of intent (non-blocking)
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await supabase.from("platform_operation_outcomes").insert({
        operation: "contractor_claim_intent",
        outcome: "started",
        metadata: { slug, email, businessName, jobsPerMonth, avgTicketK },
      } as any);
    } catch {
      // ignore — table may differ; never block checkout
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "cad",
            unit_amount: 100, // 1.00 CAD
            product_data: {
              name: `UNPRO — Activation Founding Member · ${businessName || slug}`,
              description: "Profil vérifié · Visibilité IA · Matching propriétaires · Rendez-vous exclusifs",
            },
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${origin}/entrepreneur/bienvenue?slug=${encodeURIComponent(slug)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/entrepreneur/${encodeURIComponent(slug)}/reclamer?cancelled=1`,
      metadata: {
        kind: "contractor_claim_activation",
        slug,
        business_name: businessName,
        jobs_per_month: String(jobsPerMonth),
        avg_ticket_k: String(avgTicketK),
        amount_cad: "1.00",
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, id: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[claim-create-checkout] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
