// acq-create-checkout — Stripe Checkout for contractor subscription tied to a prospect
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { svc, startRun, finishRun, log, cors, requireService } from "../_shared/acq-logger.ts";

const PLANS: Record<string, { name: string; amount: number; description: string }> = {
  recrue:    { name: "Recrue",    amount: 14900,  description: "Présence AI-indexée UNPRO" },
  pro:       { name: "Pro",       amount: 34900,  description: "Jusqu'à 5 rendez-vous exclusifs" },
  premium:   { name: "Premium",   amount: 59900,  description: "Jusqu'à 10 rendez-vous exclusifs" },
  elite:     { name: "Élite",     amount: 99900,  description: "Jusqu'à 25 rendez-vous exclusifs" },
  signature: { name: "Signature", amount: 179900, description: "Jusqu'à 50 rendez-vous exclusifs" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const s = svc();
  const { prospect_id, plan_id, success_url, cancel_url } = await req.json().catch(() => ({}));
  if (!prospect_id || !plan_id) return new Response(JSON.stringify({ error: "prospect_id et plan_id requis" }), { status: 400, headers: cors });
  const plan = PLANS[plan_id];
  if (!plan) return new Response(JSON.stringify({ error: "plan_id inconnu" }), { status: 400, headers: cors });

  const runId = await startRun(s, "checkout", { prospect_id, plan_id });

  const h = await requireService(s, "stripe");
  if (!h.ok) {
    await log(s, runId, "checkout.health", "blocked", h.reason, prospect_id);
    await finishRun(s, runId, { status: "failed", error_summary: h.reason });
    return new Response(JSON.stringify({ ok: false, blocked: true, reason: h.reason }), { headers: cors });
  }

  const { data: p } = await s.from("contractor_prospects").select("*").eq("id", prospect_id).maybeSingle();
  if (!p) {
    await finishRun(s, runId, { status: "failed", error_summary: "Prospect introuvable" });
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: cors });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-04-30.basil" });
  const origin = req.headers.get("origin") || "https://unpro.ca";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: p.email || undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "cad",
          recurring: { interval: "month" },
          unit_amount: plan.amount,
          product_data: { name: `UNPRO ${plan.name}`, description: plan.description },
        },
      }],
      metadata: {
        prospect_id,
        plan_id,
        plan_name: plan.name,
        trade: p.trade || "",
        city: p.city || "",
        source: "acquisition_pipeline",
      },
      subscription_data: {
        metadata: {
          prospect_id,
          plan_id,
          source: "acquisition_pipeline",
        },
      },
      // Success/cancel routes must exist in src/app/router.tsx.
      // `/activation-success` and `/pro/onboarding/:token` are registered.
      success_url: success_url || `${origin}/activation-success?session_id={CHECKOUT_SESSION_ID}&prospect=${prospect_id}`,
      cancel_url: cancel_url || `${origin}/pro/onboarding/${prospect_id}?cancelled=1`,
    });

    await s.from("contractor_prospects").update({
      payment_status: "checkout_started",
      selected_plan: plan_id,
      onboarding_status: "started",
      updated_at: new Date().toISOString(),
    }).eq("id", prospect_id);

    await log(s, runId, "checkout.created", "success", session.id, prospect_id, { plan_id, amount: plan.amount });
    await finishRun(s, runId, { status: "succeeded", total_items: 1, succeeded_count: 1 });

    return new Response(JSON.stringify({ ok: true, url: session.url, session_id: session.id, run_id: runId }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    await log(s, runId, "checkout.error", "error", String(e), prospect_id);
    await finishRun(s, runId, { status: "failed", error_summary: String(e) });
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors });
  }
});
