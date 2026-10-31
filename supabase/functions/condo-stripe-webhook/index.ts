import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
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

    // Strict: signed events only (fail closed). Unsigned payloads could forge active subscriptions.
    const webhookSecret = Deno.env.get("STRIPE_CONDO_WEBHOOK_SECRET");
    if (!webhookSecret || !sig) {
      logStep("Rejected unsigned or unconfigured webhook");
      return new Response(JSON.stringify({ error: "signature_required" }), { status: 400 });
    }
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (_e) {
      return new Response(JSON.stringify({ error: "invalid_signature" }), { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    // ── Portfolio (multi-immeubles) — signed events only, owner-bound via server metadata ──
    {
      const obj: any = event.data.object;
      const subMeta = obj?.metadata ?? {};
      const isPortfolio = subMeta.product_type === "portfolio_premium"
        || obj?.subscription_details?.metadata?.product_type === "portfolio_premium"
        || obj?.parent?.subscription_details?.metadata?.product_type === "portfolio_premium";
      if (isPortfolio) {
        const { error: dupErr } = await supabase.from("portfolio_subscription_events").insert({
          stripe_event_id: event.id, event_type: event.type,
          portfolio_id: subMeta.portfolio_id ?? obj?.subscription_details?.metadata?.portfolio_id ?? null,
          detail: { object_id: obj?.id ?? null, status: obj?.status ?? obj?.payment_status ?? null },
        });
        if (dupErr) {
          logStep("Duplicate or unlogged portfolio event", { id: event.id });
          return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
        }
        const now = new Date().toISOString();
        if (event.type === "checkout.session.completed") {
          const pid = subMeta.portfolio_id; const uid = subMeta.supabase_user_id;
          const subId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id;
          if (obj.payment_status === "paid" && pid && uid && subId) {
            await supabase.from("portfolio_subscriptions").update({
              status: "active", stripe_subscription_id: subId, last_event_id: event.id, updated_at: now,
            }).eq("portfolio_id", pid).eq("user_id", uid);
          } else if (pid) {
            await supabase.from("portfolio_subscriptions").update({ status: "pending", last_event_id: event.id, updated_at: now }).eq("portfolio_id", pid);
          }
        } else if (event.type === "checkout.session.expired" && subMeta.portfolio_id) {
          await supabase.from("portfolio_subscriptions").update({ status: "cancelled", last_event_id: event.id, updated_at: now })
            .eq("portfolio_id", subMeta.portfolio_id).eq("status", "pending");
        } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
          const map: Record<string, string> = { active: "active", past_due: "past_due", unpaid: "past_due", canceled: "cancelled", incomplete_expired: "failed" };
          const st = event.type === "customer.subscription.deleted" ? "cancelled" : (map[obj.status] ?? null);
          if (st) await supabase.from("portfolio_subscriptions").update({
            status: st, last_event_id: event.id, updated_at: now,
            current_period_end: obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null,
          }).eq("stripe_subscription_id", obj.id);
        } else if (event.type === "invoice.payment_failed") {
          const subId = typeof obj.subscription === "string" ? obj.subscription : obj.parent?.subscription_details?.subscription;
          if (subId) await supabase.from("portfolio_subscriptions").update({ status: "past_due", last_event_id: event.id, updated_at: now }).eq("stripe_subscription_id", subId);
        }
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.product_type !== "condo_premium") break;

        const userId = session.metadata?.supabase_user_id;
        const syndicateId = session.metadata?.syndicate_id;
        if (session.payment_status !== "paid") {
          logStep("Checkout completed without confirmed payment", { status: session.payment_status });
          break;
        }
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
