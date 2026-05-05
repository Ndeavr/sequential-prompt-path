import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { contractor_id, plan_code, coupon_code, success_url, cancel_url } = await req.json();
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    const { data: c } = await sb.from("acq_contractors").select("*").eq("id", contractor_id).single();
    const { data: plan } = await sb.from("acq_pricing_plans").select("*").eq("plan_code", plan_code).single();
    if (!c || !plan) throw new Error("missing_contractor_or_plan");

    // Resolve primary trade for slot enforcement
    const { data: services } = await sb.from("acq_contractor_services")
      .select("category").eq("contractor_id", contractor_id).limit(1);
    const trade = (services?.[0] as any)?.category || "general";
    const city = c.city || "Laval";

    // Slot check (read-only here; increment happens on webhook success)
    const { data: slot } = await sb.from("acq_territory_slots")
      .select("max_slots, used_slots")
      .ilike("city", city).ilike("trade", trade).maybeSingle();
    if (slot && slot.used_slots >= slot.max_slots) {
      return new Response(JSON.stringify({ error: "territory_full", city, trade }),
        { status: 409, headers: { ...cors, "Content-Type": "application/json" } });
    }

    let amountCents = Math.round(Number(plan.monthly_price) * 100);
    let description = `Abonnement ${plan.name} — UNPRO`;
    let isTrialOffer = false;

    if (coupon_code) {
      const { data: coupon } = await sb.from("acq_coupons").select("*").eq("code", coupon_code).single();
      if (!coupon || !coupon.active) throw new Error("coupon_invalid");
      if (coupon.redemptions_count >= coupon.max_redemptions) throw new Error("coupon_exhausted");
      if (coupon.discount_type === "dynamic_to_1_dollar") {
        amountCents = (coupon.min_charge_amount || 1) * 100;
        description = `Activation UNPRO — ${plan.name} (offre 1$)`;
        isTrialOffer = true;
      }
    }

    const origin = req.headers.get("origin") || "https://unpro.ca";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: c.email || undefined,
      customer_creation: "always",
      payment_intent_data: {
        setup_future_usage: "off_session",
        description,
      },
      line_items: [{
        price_data: {
          currency: "cad",
          product_data: { name: description },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      success_url: success_url || `${origin}/activation-success?cid=${contractor_id}`,
      cancel_url: cancel_url || `${origin}/activation/${c.slug}`,
      metadata: {
        contractor_id, plan_code,
        coupon_code: coupon_code || "",
        is_trial_offer: isTrialOffer ? "1" : "0",
        slot_city: city,
        slot_trade: trade,
      },
    });

    await sb.from("acq_subscriptions").insert({
      contractor_id,
      plan_code,
      status: "pending",
      stripe_session_id: session.id,
      coupon_code: coupon_code || null,
      amount_due: Math.round(amountCents / 100),
      upgrade_plan_code: plan_code,
      auto_upgrade: true,
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id, amount: amountCents / 100 }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[acq-checkout]", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
