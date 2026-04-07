
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_PRICES: Record<string, string> = {
  "elite-fondateur": "price_1TJcXvCvZwK1QnPVs1YmFLMk",
  "signature-fondateur": "price_1TJcXwCvZwK1QnPVEwq0Eka2",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Not authenticated");

    const { planSlug, promoCode } = await req.json();
    const priceId = PLAN_PRICES[planSlug];
    if (!priceId) throw new Error("Invalid plan");

    // Check spots remaining
    const { data: plan } = await supabaseClient
      .from("founder_plans")
      .select("id, spots_remaining, status")
      .eq("slug", planSlug)
      .single();

    if (!plan || plan.status === "sold_out" || plan.spots_remaining <= 0) {
      throw new Error("Plan sold out");
    }

    // Soft reserve a spot (10 min)
    const { data: spot, error: spotErr } = await supabaseClient
      .from("founder_spots")
      .insert({
        plan_id: plan.id,
        reserved_by_user_id: user.id,
        status: "reserved",
        reserved_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (spotErr) throw new Error("Could not reserve spot");

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
      success_url: `${req.headers.get("origin")}/fondateur/plans?success=true&spot=${spot.id}`,
      cancel_url: `${req.headers.get("origin")}/fondateur/plans?canceled=true&spot=${spot.id}`,
      metadata: {
        plan_slug: planSlug,
        spot_id: spot.id,
        user_id: user.id,
      },
    };

    if (promoCode) {
      sessionParams.discounts = [{ promotion_code: promoCode }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Store purchase record
    await supabaseClient.from("founder_purchases").insert({
      user_id: user.id,
      plan_id: plan.id,
      spot_id: spot.id,
      amount_paid: 0, // Will be updated by webhook
      payment_status: "pending",
      stripe_session_id: session.id,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
