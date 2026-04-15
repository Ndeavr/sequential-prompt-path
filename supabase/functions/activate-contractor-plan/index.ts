import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { checkout_session_id } = await req.json();
    if (!checkout_session_id) throw new Error("checkout_session_id required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(checkout_session_id);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({
        success: false,
        status: session.payment_status,
        message: "Le paiement n'est pas encore confirmé.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const planCode = session.metadata?.plan_code || "pro";
    const userId = session.metadata?.user_id;
    const onboardingSessionId = session.metadata?.onboarding_session_id;

    // Update checkout session status
    if (onboardingSessionId) {
      await supabaseAdmin
        .from("contractor_checkout_sessions")
        .update({
          checkout_status: "completed",
          amount_total: session.amount_total,
          amount_subtotal: session.amount_subtotal,
          amount_tax: (session as any).total_details?.amount_tax || 0,
        })
        .eq("stripe_checkout_id", checkout_session_id);

      // Record activation event
      await supabaseAdmin.from("contractor_activation_events").insert({
        onboarding_session_id: onboardingSessionId,
        contractor_id: userId,
        event_type: "plan_activated",
        event_status: "success",
        event_payload: {
          plan_code: planCode,
          stripe_session_id: checkout_session_id,
          amount_total: session.amount_total,
          customer_email: session.customer_details?.email,
        },
      });

      // Update onboarding session
      await supabaseAdmin
        .from("contractor_onboarding_sessions")
        .update({
          payment_completed: true,
          activation_completed: true,
          current_step: "activated",
        })
        .eq("id", onboardingSessionId);
    }

    // Record payment event
    await supabaseAdmin.from("payment_events").insert({
      onboarding_session_id: onboardingSessionId,
      stripe_event_type: "checkout.session.completed",
      payment_status: "paid",
      amount: session.amount_total,
      currency: session.currency || "cad",
      raw_payload: {
        session_id: checkout_session_id,
        plan_code: planCode,
        customer_email: session.customer_details?.email,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      plan_code: planCode,
      customer_email: session.customer_details?.email,
      amount_total: session.amount_total,
      next_steps: [
        "complete_profile",
        "select_territories",
        "configure_availability",
        "add_photos",
        "connect_calendar",
      ],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[activate-contractor-plan] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
