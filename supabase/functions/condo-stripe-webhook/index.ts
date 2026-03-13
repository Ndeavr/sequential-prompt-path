import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CONDO-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    // If webhook secret is configured, verify signature
    const webhookSecret = Deno.env.get("STRIPE_CONDO_WEBHOOK_SECRET");
    let event: Stripe.Event;

    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.product_type !== "condo_premium") break;

        const userId = session.metadata?.supabase_user_id;
        const syndicateId = session.metadata?.syndicate_id;
        if (!userId || !syndicateId) {
          logStep("Missing metadata", { userId, syndicateId });
          break;
        }

        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as any)?.id;

        await supabase.from("condo_subscriptions").upsert({
          syndicate_id: syndicateId,
          user_id: userId,
          plan_tier: "premium",
          status: "active",
          stripe_customer_id: typeof session.customer === "string" ? session.customer : "",
          stripe_subscription_id: subscriptionId || "",
        }, { onConflict: "syndicate_id" });

        logStep("Subscription activated", { syndicateId, subscriptionId });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const { error } = await supabase
          .from("condo_subscriptions")
          .update({
            status: sub.status === "active" ? "active" : sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          })
          .eq("stripe_subscription_id", sub.id);
        if (error) logStep("Update error", error);
        logStep("Subscription updated", { subId: sub.id, status: sub.status });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("condo_subscriptions")
          .update({ status: "cancelled", plan_tier: "free" })
          .eq("stripe_subscription_id", sub.id);
        logStep("Subscription cancelled", { subId: sub.id });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : (invoice.subscription as any)?.id;
        if (subId) {
          await supabase
            .from("condo_subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subId);
          logStep("Payment failed", { subId });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
