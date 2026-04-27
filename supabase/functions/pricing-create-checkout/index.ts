import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GST_RATE = 0.05;
const QST_RATE = 0.09975;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await (supabaseAuth.auth as any).getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email as string;

    const supabase = createClient(supabaseUrl, serviceKey);

    const { quote_id, success_url, cancel_url } = await req.json();
    if (!quote_id) {
      return new Response(JSON.stringify({ error: "quote_id requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load quote
    const { data: quote, error: quoteErr } = await supabase
      .from("pricing_quotes")
      .select("*")
      .eq("id", quote_id)
      .single();

    if (quoteErr || !quote) {
      return new Response(JSON.stringify({ error: "Quote introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate status
    if (!["calculated", "accepted"].includes(quote.status)) {
      return new Response(JSON.stringify({ error: "Quote non valide pour checkout" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create contractor
    let { data: contractor } = await supabase
      .from("contractors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!contractor) {
      const { data: newC } = await supabase
        .from("contractors")
        .insert({ user_id: userId, business_name: userEmail })
        .select("id")
        .single();
      contractor = newC;
    }

    // Update quote
    await supabase
      .from("pricing_quotes")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        contractor_id: contractor?.id,
      })
      .eq("id", quote_id);

    // Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get or create customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const c = await stripe.customers.create({
        email: userEmail,
        metadata: { contractor_id: contractor?.id || "", user_id: userId },
      });
      customerId = c.id;
    }

    const origin = req.headers.get("origin") || "https://sequential-prompt-path.lovable.app";

    // Build amounts in cents
    const subtotalCents = Math.round(quote.subtotal_amount * 100);
    const gstCents = Math.round(quote.gst_amount * 100);
    const qstCents = Math.round(quote.qst_amount * 100);

    // Load category & plan names for display
    const { data: cat } = await supabase
      .from("pricing_categories")
      .select("name_fr")
      .eq("id", quote.category_id)
      .single();
    const { data: mkt } = await supabase
      .from("pricing_markets")
      .select("city_name")
      .eq("id", quote.market_id)
      .single();

    const planLabel = `UNPRO ${quote.selected_plan_code.charAt(0).toUpperCase() + quote.selected_plan_code.slice(1)}`;
    const periodLabel = quote.selected_billing_period === "year" ? "annuel" : "mensuel";
    const isRecurring = true; // subscriptions

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "cad",
          product_data: {
            name: `${planLabel} — ${periodLabel}`,
            description: `${cat?.name_fr || ""} · ${mkt?.city_name || ""} · ${quote.selected_rendezvous_count} RDV`,
          },
          unit_amount: subtotalCents,
          ...(isRecurring ? {
            recurring: {
              interval: quote.selected_billing_period === "year" ? "year" : "month" as any,
            },
          } : {}),
        },
        quantity: 1,
      },
    ];

    // Add tax line items
    if (gstCents > 0) {
      lineItems.push({
        price_data: {
          currency: "cad",
          product_data: { name: "TPS (5%)" },
          unit_amount: gstCents,
          ...(isRecurring ? {
            recurring: { interval: quote.selected_billing_period === "year" ? "year" : "month" as any },
          } : {}),
        },
        quantity: 1,
      });
    }
    if (qstCents > 0) {
      lineItems.push({
        price_data: {
          currency: "cad",
          product_data: { name: "TVQ (9.975%)" },
          unit_amount: qstCents,
          ...(isRecurring ? {
            recurring: { interval: quote.selected_billing_period === "year" ? "year" : "month" as any },
          } : {}),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      success_url: success_url || `${origin}/entrepreneur/payment-success?quote_id=${quote_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${origin}/entrepreneur/payment-cancelled?quote_id=${quote_id}`,
      metadata: {
        pricing_quote_id: quote_id,
        contractor_id: contractor?.id || "",
        plan_code: quote.selected_plan_code,
        billing_period: quote.selected_billing_period,
      },
      subscription_data: {
        metadata: {
          pricing_quote_id: quote_id,
          contractor_id: contractor?.id || "",
          plan_code: quote.selected_plan_code,
        },
      },
    });

    // Save checkout session
    await supabase
      .from("pricing_checkout_sessions")
      .insert({
        pricing_quote_id: quote_id,
        contractor_id: contractor?.id,
        stripe_checkout_session_id: session.id,
        stripe_customer_id: customerId,
        currency: "CAD",
        subtotal_amount: quote.subtotal_amount,
        gst_amount: quote.gst_amount,
        qst_amount: quote.qst_amount,
        total_amount: quote.total_amount,
        status: "open",
        checkout_url: session.url,
      });

    // Update quote status
    await supabase
      .from("pricing_quotes")
      .update({ status: "checkout_created" })
      .eq("id", quote_id);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Pricing checkout error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
