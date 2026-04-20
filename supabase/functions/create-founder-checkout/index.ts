
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Legacy founder slugs (kept for compat). The new founder_lifetime plan resolves
// dynamically from plan_catalog.stripe_one_time_price_id below.
const LEGACY_PLAN_PRICES: Record<string, string> = {
  "elite-fondateur": "price_1TJcXvCvZwK1QnPVs1YmFLMk",
  "signature-fondateur": "price_1TJcXwCvZwK1QnPVEwq0Eka2",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  // Auth client (anon) to verify the user
  const authClient = createClient(supabaseUrl, anonKey);
  // Admin client (service role) to bypass RLS for spot reservation
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await authClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Not authenticated");

    const { planSlug, promoCode } = await req.json();
    if (!planSlug) throw new Error("planSlug or planCode required");

    // Resolve price: 1) plan_catalog (new dynamic Founder plans), 2) legacy hard-coded slugs
    let priceId: string | undefined = LEGACY_PLAN_PRICES[planSlug];
    if (!priceId) {
      const { data: planRow } = await adminClient
        .from("plan_catalog")
        .select("stripe_one_time_price_id, billing_mode, active")
        .eq("code", planSlug)
        .eq("active", true)
        .maybeSingle();
      if (planRow?.billing_mode === "one_time" && planRow.stripe_one_time_price_id) {
        priceId = planRow.stripe_one_time_price_id;
      }
    }
    if (!priceId) throw new Error("Invalid plan");

    // Check spots remaining
    const { data: plan, error: planErr } = await adminClient
      .from("founder_plans")
      .select("id, spots_remaining, status")
      .eq("slug", planSlug)
      .single();

    if (planErr || !plan) throw new Error("Plan not found");
    if (plan.status === "sold_out" || plan.spots_remaining <= 0) {
      throw new Error("Plan sold out");
    }

    // Soft reserve a spot (10 min) using admin client to bypass RLS
    const { data: spot, error: spotErr } = await adminClient
      .from("founder_spots")
      .insert({
        plan_id: plan.id,
        reserved_by_user_id: user.id,
        status: "reserved",
        reserved_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (spotErr) {
      console.error("Spot reservation error:", spotErr);
      throw new Error("Could not reserve spot");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      // Tax: UNPRO is the pricing brain; Stripe Tax handles QC GST/QST automatically (exclusive on the price)
      automatic_tax: { enabled: true },
      ...(customerId ? { customer_update: { address: "auto", name: "auto" } } : {}),
      tax_id_collection: { enabled: true },
      // Promo codes (UNPRO promo + Stripe promo codes accepted at checkout)
      allow_promotion_codes: !promoCode,
      success_url: `${req.headers.get("origin")}/fondateur/plans?success=true&spot=${spot.id}`,
      cancel_url: `${req.headers.get("origin")}/fondateur/plans?canceled=true&spot=${spot.id}`,
      metadata: {
        plan_slug: planSlug,
        plan_code: planSlug,
        spot_id: spot.id,
        user_id: user.id,
      },
    };

    if (promoCode) {
      sessionParams.discounts = [{ promotion_code: promoCode }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Store purchase record using admin client
    await adminClient.from("founder_purchases").insert({
      user_id: user.id,
      plan_id: plan.id,
      spot_id: spot.id,
      amount_paid: 0,
      payment_status: "pending",
      stripe_session_id: session.id,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
