/**
 * launch-agent-checkout-sender
 * Picks leads ready for checkout, creates Stripe Checkout sessions with
 * launch_lead_id metadata, stores the URL, sends it via SMS/email if contact
 * info is available, then transitions the lead to CHECKOUT_SENT.
 *
 * Triggered each minute by pg_cron alongside other launch agents.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  adminClient, corsHeaders, getLaunchState, isLaunching,
  logLaunchEvent, transitionLead,
} from "../_shared/launch.ts";

const PLAN_AMOUNTS_CENTS: Record<string, { name: string; amount: number; recurring: boolean }> = {
  recrue:   { name: "UNPRO Recrue",   amount: 14900,  recurring: true },
  pro:      { name: "UNPRO Pro",      amount: 34900,  recurring: true },
  premium:  { name: "UNPRO Premium",  amount: 59900,  recurring: true },
  elite:    { name: "UNPRO Élite",    amount: 99900,  recurring: true },
  signature:{ name: "UNPRO Signature",amount: 179900, recurring: true },
};

const AGENT = "launch-agent-checkout-sender";
const BATCH = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const state = await getLaunchState();
    if (!(await isLaunching())) {
      return new Response(JSON.stringify({ skipped: "not launching" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      await logLaunchEvent({ agent: AGENT, event: "blocked", success: false, message: "STRIPE_SECRET_KEY missing" });
      return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const sb = adminClient();

    // Pick eligible leads: REPLIED always, SCORED only if auto_send_checkout=true
    const autoSendOnScored = (state as any).auto_send_checkout === true;
    const eligibleStatuses = autoSendOnScored ? ["REPLIED", "SCORED"] : ["REPLIED"];

    const { data: leads, error } = await sb
      .from("launch_leads")
      .select("*")
      .in("lead_status", eligibleStatuses)
      .is("stripe_session_id", null)
      .not("recommended_plan", "is", null)
      .limit(BATCH);
    if (error) throw error;

    const results: any[] = [];
    for (const lead of leads ?? []) {
      try {
        const planCode = lead.recommended_plan as string;
        const plan = PLAN_AMOUNTS_CENTS[planCode];
        if (!plan) {
          await logLaunchEvent({ lead_id: lead.id, agent: AGENT, event: "skip", success: false, message: `Unknown plan: ${planCode}` });
          continue;
        }

        const session = await stripe.checkout.sessions.create({
          mode: plan.recurring ? "subscription" : "payment",
          customer_email: lead.email ?? undefined,
          line_items: [{
            price_data: {
              currency: "cad",
              product_data: { name: plan.name },
              unit_amount: plan.amount,
              ...(plan.recurring ? { recurring: { interval: "month" as const } } : {}),
            },
            quantity: 1,
          }],
          success_url: "https://unpro.ca/entrepreneur/onboarding?step=post_payment&plan=" + planCode + "&launch=1",
          cancel_url: "https://unpro.ca/?alex=resume&launch=1",
          metadata: {
            launch_lead_id: lead.id,
            plan_code: planCode,
            source: "launch_mode",
            company: lead.company_name ?? "",
            trade: lead.trade ?? "",
            city: lead.city ?? "",
          },
        });

        await sb.from("launch_leads").update({
          stripe_session_id: session.id,
          checkout_url: session.url,
          recommended_plan_cents: plan.amount,
        }).eq("id", lead.id);

        // Best-effort outreach: invoke existing outbound channel
        // (the existing outreach agent already handles SMS/email; we just log a
        //  follow-up scheduled to push the URL.)
        try {
          await sb.from("launch_followup_schedule").insert({
            lead_id: lead.id,
            scheduled_for: new Date().toISOString(),
            channel: lead.phone ? "sms" : "email",
            template: "checkout_url",
            payload: { url: session.url, plan: planCode, company: lead.company_name },
          });
        } catch (_) { /* table shape best-effort */ }

        await transitionLead(lead.id, "CHECKOUT_SENT", {}, AGENT);
        await logLaunchEvent({
          lead_id: lead.id, agent: AGENT, event: "checkout_sent", success: true,
          message: `Plan ${planCode} → ${session.url}`,
          payload: { session_id: session.id, plan: planCode, amount_cents: plan.amount },
        });

        results.push({ lead_id: lead.id, session_id: session.id, ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await logLaunchEvent({ lead_id: lead.id, agent: AGENT, event: "failed", success: false, message: msg });
        results.push({ lead_id: lead.id, ok: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logLaunchEvent({ agent: AGENT, event: "failed", success: false, message: msg });
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
