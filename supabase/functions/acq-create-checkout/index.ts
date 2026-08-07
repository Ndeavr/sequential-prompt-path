// acq-create-checkout — Stripe Checkout for contractor subscription tied to a prospect
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { svc, startRun, finishRun, log, cors, requireService } from "../_shared/acq-logger.ts";
// CANONICAL PRICING — never hardcode amounts here. See _shared/planCatalog.ts.
import { resolvePlan, planLineItem, planMetadata, planErrorResponse } from "../_shared/planCatalog.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const s = svc();
  const { prospect_id, plan_id, success_url, cancel_url } = await req.json().catch(() => ({}));
  if (!prospect_id || !plan_id) return new Response(JSON.stringify({ error: "prospect_id et plan_id requis" }), { status: 400, headers: cors });
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

  let plan;
  try {
    plan = await resolvePlan(s, plan_id);
  } catch (e) {
    await log(s, runId, "checkout.plan", "error", String(e), prospect_id);
    await finishRun(s, runId, { status: "failed", error_summary: String(e) });
    return planErrorResponse(e, cors as Record<string, string>);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: p.email || undefined,
      line_items: [planLineItem(plan, "month")],
      metadata: planMetadata(plan, {
        prospect_id,
        plan_id: plan.code,
        trade: p.trade || "",
        city: p.city || "",
        source: "acquisition_pipeline",
      }),
      subscription_data: {
        metadata: {
          prospect_id,
          plan_id: plan.code,
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
      selected_plan: plan.code,
      onboarding_status: "started",
      updated_at: new Date().toISOString(),
    }).eq("id", prospect_id);

    await log(s, runId, "checkout.created", "success", session.id, prospect_id, { plan_id: plan.code, amount: plan.monthlyPrice });
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
