import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, d?: any) =>
  console.log(`[STRIPE-LIVE-VERIFY] ${step}${d ? " — " + JSON.stringify(d) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const { action } = await req.json();
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ── ACTION: health ──
    if (action === "health") {
      log("Health check");
      try {
        const acct = await stripe.accounts.retrieve();
        return new Response(JSON.stringify({
          connected: true,
          livemode: !stripeKey.startsWith("sk_test"),
          account_id: acct.id,
          charges_enabled: acct.charges_enabled,
          payouts_enabled: acct.payouts_enabled,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ connected: false, error: e instanceof Error ? e.message : String(e) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }
    }

    // ── ACTION: import-contractor ──
    if (action === "import-contractor") {
      log("Importing Isolation Solution Royal");
      const bizName = "Isolation Solution Royal";
      const domain = "isroyal.ca";
      const category = "isolation";

      // Upsert contractor
      const { data: existing } = await supabase
        .from("contractors")
        .select("id")
        .eq("business_name", bizName)
        .maybeSingle();

      let contractorId: string;
      if (existing) {
        contractorId = existing.id;
        await supabase.from("contractors").update({
          website: domain,
          specialty: category,
          onboarding_status: "imported",
        }).eq("id", contractorId);
      } else {
        const { data: ins, error } = await supabase.from("contractors").insert({
          business_name: bizName,
          website: domain,
          specialty: category,
          onboarding_status: "imported",
          activation_status: "inactive",
        }).select("id").single();
        if (error) throw error;
        contractorId = ins.id;
      }

      // Snapshot
      await supabase.from("contractor_import_snapshots").insert({
        contractor_id: contractorId,
        business_name: bizName,
        domain,
        category,
        import_source: "stripe_verification",
        snapshot_json: { business_name: bizName, domain, category, plan: "Signature" },
      });

      log("Contractor imported", { contractorId });
      return new Response(JSON.stringify({
        contractor_id: contractorId,
        business_name: bizName,
        domain,
        category,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── ACTION: create-checkout ──
    if (action === "create-checkout") {
      const { contractor_id } = await req.clone().then(r => r.json());
      log("Creating checkout", { contractor_id });

      // Get contractor
      const { data: contractor } = await supabase
        .from("contractors").select("business_name, email").eq("id", contractor_id).single();
      if (!contractor) throw new Error("Contractor not found");

      // Stripe customer
      const email = contractor.email || "test-isroyal@unpro.ca";
      const customers = await stripe.customers.list({ email, limit: 1 });
      let customerId: string;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const cust = await stripe.customers.create({
          email,
          name: contractor.business_name,
          metadata: { contractor_id, source: "stripe_live_verification" },
        });
        customerId = cust.id;
      }

      // Create coupon (100% off minus $1 = effectively $1 charge)
      // Use amount_off on the plan price to leave exactly $1
      const couponName = "Fondateur UNPRO - Vérification Live";
      
      // Get Signature plan price from catalog
      const { data: plan } = await supabase
        .from("plan_catalog")
        .select("monthly_price, stripe_monthly_price_id")
        .eq("code", "Signature")
        .eq("active", true)
        .single();

      if (!plan?.stripe_monthly_price_id) throw new Error("Signature plan not found in catalog");

      const discountAmount = (plan.monthly_price || 49900) - 100; // leave 100 cents ($1)
      const coupon = await stripe.coupons.create({
        name: couponName,
        amount_off: discountAmount,
        currency: "cad",
        duration: "once",
        metadata: { type: "founder_verification", contractor_id },
      });

      log("Coupon created", { coupon_id: coupon.id, amount_off: discountAmount });

      // Create checkout session
      const origin = req.headers.get("origin") || "https://sequential-prompt-path.lovable.app";
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: plan.stripe_monthly_price_id, quantity: 1 }],
        mode: "subscription",
        discounts: [{ coupon: coupon.id }],
        success_url: `${origin}/admin/stripe-verification?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/admin/stripe-verification?status=canceled`,
        metadata: {
          contractor_id,
          plan_code: "Signature",
          verification_flow: "true",
        },
      });

      // Store checkout session
      await supabase.from("billing_checkout_sessions").insert({
        contractor_id,
        stripe_checkout_session_id: session.id,
        stripe_customer_id: customerId,
        amount_total: 100,
        currency: "cad",
        checkout_status: "open",
        payment_status: "unpaid",
        plan_code: "Signature",
        coupon_code: coupon.id,
        metadata_json: {
          coupon_name: couponName,
          discount_amount: discountAmount,
          original_price: plan.monthly_price,
        },
      });

      log("Checkout created", { session_id: session.id, url: session.url });
      return new Response(JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
        customer_id: customerId,
        coupon_id: coupon.id,
        amount_charged: 100,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── ACTION: verify-payment ──
    if (action === "verify-payment") {
      const { session_id } = await req.clone().then(r => r.json());
      log("Verifying payment", { session_id });

      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["subscription", "payment_intent"],
      });

      // Update checkout session
      await supabase.from("billing_checkout_sessions")
        .update({
          checkout_status: session.status || "complete",
          payment_status: session.payment_status || "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_checkout_session_id", session_id);

      // If paid, update contractor
      if (session.payment_status === "paid") {
        const contractorId = session.metadata?.contractor_id;
        if (contractorId) {
          // Update subscription
          const sub = session.subscription as any;
          if (sub) {
            await supabase.from("contractor_subscriptions").upsert({
              contractor_id: contractorId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: typeof sub === "string" ? sub : sub.id,
              plan_id: "Signature",
              status: "active",
              billing_interval: "month",
              activation_source: "stripe_live_verification",
            }, { onConflict: "contractor_id" });
          }

          await supabase.from("contractors").update({
            activation_status: "active",
            onboarding_status: "complete",
          }).eq("id", contractorId);
        }
      }

      return new Response(JSON.stringify({
        status: session.status,
        payment_status: session.payment_status,
        subscription_id: typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as any)?.id,
        amount_total: session.amount_total,
        currency: session.currency,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── ACTION: check-webhooks ──
    if (action === "check-webhooks") {
      const { data: events } = await supabase
        .from("billing_webhook_events")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(20);

      const { data: logEvents } = await supabase
        .from("billing_events_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({
        webhook_events: events || [],
        billing_log_events: logEvents || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: any) {
    log("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
