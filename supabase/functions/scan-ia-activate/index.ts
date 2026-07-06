// scan-ia-activate — Stripe Checkout $1 / 7-day activation for scan wizard.
// Public: no account required.

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Paiement temporairement indisponible." }, 503);

    const body = await req.json().catch(() => ({}));
    const {
      report_id,
      session_token,
      email,
      business_name,
      goal,
      capacity,
      recommended_plan,
      plan_name,
      plan_monthly_price_cents,
    } = body ?? {};

    if (!session_token) return json({ error: "Session invalide." }, 400);

    // Persist user choices before starting checkout
    if (SUPABASE_URL && SERVICE_ROLE) {
      const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
      await sb
        .from("scan_ia_reports")
        .update({
          user_goal: goal ?? null,
          user_capacity: capacity ?? null,
          recommended_plan: recommended_plan ?? null,
        })
        .eq("session_token", session_token);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") ?? "https://unpro.ca";

    // Post-trial pricing summary for transparency
    const monthlyDollars = Math.round((Number(plan_monthly_price_cents) || 0) / 100);
    const GST = 0.05;
    const QST = 0.09975;
    const totalTaxIncl = monthlyDollars > 0
      ? Math.round(monthlyDollars * (1 + GST + QST) * 100) / 100
      : 0;
    const nextChargeDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const nextChargeFR = nextChargeDate.toLocaleDateString("fr-CA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const planLabel = plan_name || "Premium";
    const productName = `Activation IA UNPRO — Plan ${planLabel}`;
    const productDescription = monthlyDollars > 0
      ? `1 $ aujourd'hui pour 7 jours d'accès complet. Puis ${monthlyDollars} $/mois (${totalTaxIncl.toFixed(2)} $ taxes QC incluses) à partir du ${nextChargeFR}. Annulation en 1 clic avant le jour 8.`
      : "Profil IA, territoires, catégories, apparition dans Alex, réception de rendez-vous.";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email || undefined,
      client_reference_id: String(session_token),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: 100,
            product_data: {
              name: productName,
              description: productDescription,
            },
          },
        },
      ],
      custom_text: {
        submit: {
          message: monthlyDollars > 0
            ? `Vous payez 1 $ aujourd'hui. Le ${nextChargeFR}, votre plan ${planLabel} démarrera à ${monthlyDollars} $/mois (${totalTaxIncl.toFixed(2)} $ taxes incluses). Annulation en 1 clic avant cette date.`
            : "Vous payez 1 $ aujourd'hui pour 7 jours d'accès complet.",
        },
      },
      metadata: {
        source: "scan_ia_wizard",
        report_id: String(report_id ?? ""),
        session_token: String(session_token),
        business_name: String(business_name ?? ""),
        goal: String(goal ?? ""),
        capacity: String(capacity ?? ""),
        recommended_plan: String(recommended_plan ?? ""),
        plan_name: String(planLabel),
        plan_monthly_price_cents: String(plan_monthly_price_cents ?? ""),
        next_charge_date: nextChargeDate.toISOString(),
      },
      success_url: `${origin}/scan-ia/activation-success?st=${encodeURIComponent(session_token)}&cs={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/scan-ia/wizard?st=${encodeURIComponent(session_token)}`,
    });

    return json({ success: true, url: session.url });

  } catch (e) {
    console.error("scan-ia-activate error:", e);
    const msg = e instanceof Error ? e.message : "Paiement indisponible.";
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
