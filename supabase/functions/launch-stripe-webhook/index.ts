/**
 * launch-stripe-webhook
 * Public endpoint. Verifies Stripe signature, marks launch leads as PAID,
 * stores subscription_id, and surfaces the event so launch-agent-activator
 * can finish activation on the next tick.
 *
 * verify_jwt = false (see supabase/config.toml).
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { adminClient, logLaunchEvent, transitionLead } from "../_shared/launch.ts";

const AGENT = "launch-stripe-webhook";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Missing Stripe env", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig!, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[launch-stripe-webhook] signature verification failed", msg);
    return new Response("Bad signature: " + msg, { status: 400 });
  }

  const sb = adminClient();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const leadId = session.metadata?.launch_lead_id;
      if (leadId) {
        const amount = session.amount_total ?? 0;
        await sb.from("launch_leads").update({
          paid_at: new Date().toISOString(),
          mrr_cents: amount,
          revenue_impact_cents: amount,
          subscription_id: (session.subscription as string | null) ?? null,
        }).eq("id", leadId);
        await transitionLead(leadId, "PAID", {}, AGENT);
        await logLaunchEvent({
          lead_id: leadId, agent: AGENT, event: "paid", success: true,
          message: `Stripe ${session.id} paid ${amount}¢`,
          payload: { session_id: session.id, amount_cents: amount, plan: session.metadata?.plan_code },
        });
      }
    }

    if (event.type === "customer.subscription.created") {
      const sub = event.data.object as Stripe.Subscription;
      const leadId = sub.metadata?.launch_lead_id;
      if (leadId) {
        await sb.from("launch_leads").update({ subscription_id: sub.id }).eq("id", leadId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logLaunchEvent({ agent: AGENT, event: "failed", success: false, message: msg, payload: { stripe_event: event.type } });
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
