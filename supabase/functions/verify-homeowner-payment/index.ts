import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

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
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const { sessionId } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return new Response(
        JSON.stringify({ verified: false, status: session.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customer = session.customer as Stripe.Customer;
    const subscription = session.subscription as Stripe.Subscription;
    const planCode = session.metadata?.plan_code || "plus";
    const userId = session.metadata?.user_id || null;

    // Update homeowner_subscriptions if user was logged in
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (userId) {
      await serviceClient
        .from("homeowner_subscriptions")
        .update({
          status: "active",
          stripe_customer_id: customer?.id,
          stripe_subscription_id: subscription?.id,
          current_period_start: subscription
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : new Date().toISOString(),
          current_period_end: subscription
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : new Date(Date.now() + 365 * 86400000).toISOString(),
        })
        .eq("stripe_checkout_session_id", sessionId);
    }

    return new Response(
      JSON.stringify({
        verified: true,
        email: customer?.email || session.customer_details?.email,
        planCode,
        userId,
        hasAccount: !!userId,
        customerName: customer?.name || session.customer_details?.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Verify payment error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
