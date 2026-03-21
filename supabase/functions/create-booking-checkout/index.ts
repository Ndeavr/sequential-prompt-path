import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UNPRO_FEE_RATE = 0.30;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const {
      booking_id,
      contractor_id,
      appointment_type_title,
      price_cents,
      client_email,
      client_name,
    } = body;

    if (!booking_id || !contractor_id || !price_cents || price_cents <= 0) {
      throw new Error("Missing required fields: booking_id, contractor_id, price_cents");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://sequential-prompt-path.lovable.app";

    // Calculate split
    const unproFeeCents = Math.round(price_cents * UNPRO_FEE_RATE);
    const contractorAmountCents = price_cents - unproFeeCents;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: client_email || undefined,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: appointment_type_title || "Rendez-vous UNPRO",
              description: `Réservation avec ${client_name || "entrepreneur"}`,
            },
            unit_amount: price_cents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/book/success?booking_id=${booking_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/book/cancel?booking_id=${booking_id}`,
      metadata: {
        booking_id,
        contractor_id,
        unpro_fee_cents: String(unproFeeCents),
        contractor_amount_cents: String(contractorAmountCents),
        source: "unpro_booking_intelligence",
      },
    });

    // Create pending transaction
    await supabase.from("booking_transactions").insert({
      booking_id,
      contractor_id,
      amount_total_cents: price_cents,
      unpro_fee_cents: unproFeeCents,
      contractor_amount_cents: contractorAmountCents,
      fee_rate: UNPRO_FEE_RATE,
      stripe_session_id: session.id,
      status: "pending",
    });

    // Update booking status
    await supabase
      .from("smart_bookings")
      .update({ status: "pending_payment" })
      .eq("id", booking_id);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[create-booking-checkout] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
