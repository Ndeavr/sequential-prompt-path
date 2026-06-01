// Confirm ISR demo checkout: fetches Stripe session and updates demo row.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id } = await req.json();
    if (!session_id || typeof session_id !== "string") {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const paid = session.payment_status === "paid";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    if (paid) {
      await supabase
        .from("demo_contractor_plan_tests")
        .update({ payment_status: "paid", flow_status: "paid" })
        .eq("stripe_session_id", session_id);
    }

    return new Response(
      JSON.stringify({
        paid,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        contractor_name: session.metadata?.contractor_name ?? "Isolation Solution Royal",
        selected_plan: session.metadata?.selected_plan ?? "Signature",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[confirm-isr-demo-checkout]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
