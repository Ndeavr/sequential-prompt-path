import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_PRICES: Record<string, string> = {
  plus: "price_1TJfluCvZwK1QnPVMBBo3eUK",
  signature: "price_1TJflvCvZwK1QnPVRX3aQTqH",
};

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

    const { planCode, promoCode } = await req.json();

    if (!planCode || !PLAN_PRICES[planCode]) {
      return new Response(
        JSON.stringify({ error: "Plan invalide. Choisissez 'plus' ou 'signature'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://sequential-prompt-path.lovable.app";

    // Check if user is authenticated (optional for guest checkout)
    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = req.headers.get("Authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getClaims(token);
      if (data?.claims) {
        userId = data.claims.sub as string;
        userEmail = data.claims.email as string;
      }
    }

    // Find or create Stripe customer
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // Build checkout session config
    const checkoutConfig: any = {
      mode: "subscription",
      line_items: [{ price: PLAN_PRICES[planCode], quantity: 1 }],
      success_url: `${origin}/proprietaire/bienvenue?session_id={CHECKOUT_SESSION_ID}&plan=${planCode}`,
      cancel_url: `${origin}/tarifs?tab=proprietaires`,
      metadata: {
        plan_code: planCode,
        plan_type: "homeowner",
        ...(userId && { user_id: userId }),
      },
      subscription_data: {
        metadata: {
          plan_code: planCode,
          plan_type: "homeowner",
          ...(userId && { user_id: userId }),
        },
      },
      allow_promotion_codes: !promoCode, // If user provided promo, we attach it manually
    };

    if (customerId) {
      checkoutConfig.customer = customerId;
    } else if (userEmail) {
      checkoutConfig.customer_email = userEmail;
    }

    // Handle promo code
    if (promoCode && promoCode.trim()) {
      try {
        // Look up Stripe promotion code
        const promoCodes = await stripe.promotionCodes.list({
          code: promoCode.trim().toUpperCase(),
          active: true,
          limit: 1,
        });
        if (promoCodes.data.length > 0) {
          checkoutConfig.discounts = [{ promotion_code: promoCodes.data[0].id }];
          checkoutConfig.allow_promotion_codes = false;
        } else {
          // Try creating a one-time coupon
          // Fall back to allowing Stripe's own promo code field
          checkoutConfig.allow_promotion_codes = true;
        }
      } catch (e) {
        console.error("Promo code lookup failed:", e);
        checkoutConfig.allow_promotion_codes = true;
      }
    }

    const session = await stripe.checkout.sessions.create(checkoutConfig);

    // Log in DB if user is authenticated
    if (userId) {
      const serviceClient = createClient(supabaseUrl, serviceKey);
      await serviceClient.from("homeowner_subscriptions").insert({
        user_id: userId,
        plan_code: planCode,
        status: "pending",
        stripe_checkout_session_id: session.id,
        promo_code: promoCode?.trim().toUpperCase() || null,
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Homeowner checkout error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
