// Cron: hourly. Promotes trial_active subscriptions to live recurring subs after trial_ends_at.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const now = new Date();
  const results: any[] = [];

  const { data: due } = await sb.from("acq_subscriptions")
    .select("*")
    .eq("status", "trial_active")
    .eq("auto_upgrade", true)
    .lte("trial_ends_at", now.toISOString());

  for (const sub of (due || [])) {
    try {
      if (!sub.payment_method_on_file || !sub.stripe_customer_id || !sub.stripe_payment_method_id) {
        // Warn first, escalate to past_due after 48h
        if (!sub.warned_at) {
          await sb.from("acq_subscriptions")
            .update({ warned_at: now.toISOString(), upgrade_failed_reason: "missing_payment_method" })
            .eq("id", sub.id);
          // Fire warning email via follow-up function
          await sb.functions.invoke("acq-followup-send", {
            body: { contractor_id: sub.contractor_id, sequence_code: "day_6" }
          }).catch(() => {});
          results.push({ id: sub.id, action: "warned" });
        } else {
          const warned = new Date(sub.warned_at);
          if (now.getTime() - warned.getTime() > 48 * 3600 * 1000) {
            await sb.from("acq_subscriptions")
              .update({ status: "past_due" }).eq("id", sub.id);
            results.push({ id: sub.id, action: "past_due" });
          }
        }
        continue;
      }

      const { data: plan } = await sb.from("acq_pricing_plans")
        .select("*").eq("plan_code", sub.upgrade_plan_code || sub.plan_code).single();
      if (!plan) throw new Error("plan_missing");

      const stripeSub = await stripe.subscriptions.create({
        customer: sub.stripe_customer_id,
        default_payment_method: sub.stripe_payment_method_id,
        items: [{
          price_data: {
            currency: "cad",
            product: undefined as any,
            recurring: { interval: "month" },
            unit_amount: Math.round(Number(plan.monthly_price) * 100),
            product_data: { name: `UNPRO — ${plan.name}` } as any,
          } as any,
        }],
        metadata: {
          acq_contractor_id: sub.contractor_id,
          acq_subscription_id: sub.id,
          plan_code: plan.plan_code,
        },
      });

      await sb.from("acq_subscriptions").update({
        status: "active",
        stripe_subscription_id: stripeSub.id,
        upgrade_attempted_at: now.toISOString(),
        upgrade_failed_reason: null,
      }).eq("id", sub.id);

      results.push({ id: sub.id, action: "upgraded", stripe_sub: stripeSub.id });
    } catch (e: any) {
      await sb.from("acq_subscriptions").update({
        upgrade_attempted_at: now.toISOString(),
        upgrade_failed_reason: String(e?.message ?? e),
      }).eq("id", sub.id);
      results.push({ id: sub.id, action: "error", error: String(e?.message ?? e) });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...cors, "Content-Type": "application/json" }
  });
});
