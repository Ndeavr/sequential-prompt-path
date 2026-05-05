import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });
    const body = await req.text();

    let event: Stripe.Event;

    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) {
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Idempotency: log event
    const { data: existingLog } = await supabase
      .from("integration_audit_logs")
      .select("id")
      .eq("integration_name", "stripe")
      .eq("action_name", event.id)
      .maybeSingle();

    if (existingLog) {
      console.log(`Duplicate webhook event ${event.id}, skipping`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log event
    await supabase.from("integration_audit_logs").insert({
      integration_name: "stripe",
      action_name: event.id,
      status: "processing",
      payload: { type: event.type },
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const contractorId = session.metadata?.contractor_id;
        const planId = session.metadata?.plan_id;
        const planCode = session.metadata?.plan_code;
        const billingInterval = session.metadata?.billing_interval || "month";
        const redemptionId = session.metadata?.redemption_id;
        const promoCode = session.metadata?.promo_code;

        // ACQ flow: acquisition pipeline (acq_subscriptions / acq_contractors)
        if (contractorId && planCode && !planId) {
          const couponCode = session.metadata?.coupon_code || null;
          await supabase
            .from("acq_subscriptions")
            .update({
              status: "trial_active",
              stripe_session_id: session.id,
              activated_at: new Date().toISOString(),
              amount_paid: (session.amount_total || 0) / 100,
            })
            .eq("stripe_session_id", session.id);

          await supabase
            .from("acq_contractors")
            .update({ status: "active" })
            .eq("id", contractorId);

          if (couponCode) {
            const { data: coupon } = await supabase
              .from("acq_coupons")
              .select("id, redemptions_count")
              .eq("code", couponCode)
              .maybeSingle();
            if (coupon) {
              await supabase.from("acq_coupon_redemptions").insert({
                contractor_id: contractorId,
                coupon_id: coupon.id,
                code: couponCode,
                stripe_session_id: session.id,
                amount_charged: (session.amount_total || 0) / 100,
              });
              await supabase
                .from("acq_coupons")
                .update({ redemptions_count: (coupon.redemptions_count || 0) + 1 })
                .eq("id", coupon.id);
            }
          }

          await supabase.from("acq_payment_events").insert({
            contractor_id: contractorId,
            event_type: "checkout.session.completed",
            stripe_event_id: event.id,
            payload: session as any,
          });
          break;
        }

        if (!contractorId || !planId) break;

        const subscription = session.subscription
          ? await stripe.subscriptions.retrieve(session.subscription as string)
          : null;

        // Update checkout_sessions
        await supabase
          .from("checkout_sessions")
          .update({
            checkout_status: "paid",
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription?.id || null,
            currency: session.currency?.toUpperCase() || "CAD",
          })
          .eq("external_checkout_id", session.id);

        // Upsert contractor_subscriptions
        if (subscription) {
          await supabase.from("contractor_subscriptions").upsert(
            {
              contractor_id: contractorId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              plan_id: planId,
              billing_interval: billingInterval,
              status: subscription.status,
              current_period_start: new Date(
                subscription.current_period_start * 1000
              ).toISOString(),
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "contractor_id" }
          );
        }

        // Activate contractor
        await supabase
          .from("contractors")
          .update({
            status: "active",
            subscription_plan: planId,
          })
          .eq("id", contractorId);

        // Consume promo redemption
        if (redemptionId) {
          await supabase
            .from("promo_code_redemptions")
            .update({ status: "consumed" })
            .eq("id", redemptionId)
            .eq("status", "reserved");
        }

        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const redemptionId = session.metadata?.redemption_id;

        // Mark checkout as expired
        await supabase
          .from("checkout_sessions")
          .update({ checkout_status: "expired" })
          .eq("external_checkout_id", session.id);

        // Reverse promo reservation so user can try again
        if (redemptionId) {
          await supabase
            .from("promo_code_redemptions")
            .update({ status: "reversed" })
            .eq("id", redemptionId)
            .eq("status", "reserved");
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        const subscription = await stripe.subscriptions.retrieve(subId);
        const planId = subscription.metadata?.plan_id;
        const billingInterval = subscription.metadata?.billing_interval;

        const updateData: Record<string, unknown> = {
          status: subscription.status,
          current_period_start: new Date(
            subscription.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (planId) updateData.plan_id = planId;
        if (billingInterval) updateData.billing_interval = billingInterval;

        await supabase
          .from("contractor_subscriptions")
          .update(updateData)
          .eq("stripe_subscription_id", subId);

        // Ensure contractor is active
        const { data: sub } = await supabase
          .from("contractor_subscriptions")
          .select("contractor_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (sub?.contractor_id) {
          await supabase
            .from("contractors")
            .update({ status: "active" })
            .eq("id", sub.contractor_id);
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        await supabase
          .from("contractor_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const planId = subscription.metadata?.plan_id;
        const billingInterval = subscription.metadata?.billing_interval;

        const updateData: Record<string, unknown> = {
          status: subscription.status,
          current_period_start: new Date(
            subscription.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        };
        if (planId) updateData.plan_id = planId;
        if (billingInterval) updateData.billing_interval = billingInterval;

        await supabase
          .from("contractor_subscriptions")
          .update(updateData)
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from("contractor_subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);

        // Deactivate contractor
        const { data: sub } = await supabase
          .from("contractor_subscriptions")
          .select("contractor_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (sub?.contractor_id) {
          await supabase
            .from("contractors")
            .update({ status: "inactive" })
            .eq("id", sub.contractor_id);
        }

        break;
      }
    }

    // Update audit log
    await supabase
      .from("integration_audit_logs")
      .update({ status: "completed" })
      .eq("integration_name", "stripe")
      .eq("action_name", event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
