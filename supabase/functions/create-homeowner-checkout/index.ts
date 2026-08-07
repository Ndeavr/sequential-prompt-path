import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Legacy fallback if the catalog row has no Stripe price yet. */
const FALLBACK_PRICES: Record<string, string> = {
  plus: "price_1TJfluCvZwK1QnPVMBBo3eUK",
  signature: "price_1TJflvCvZwK1QnPVRX3aQTqH",
};

const CATALOG_CODE: Record<string, string> = {
  plus: "home_plus",
  signature: "home_signature",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

    const body = await req.json().catch(() => ({}));
    const mode: string = body?.mode ?? "checkout";
    const planCode: string | undefined = body?.planCode;
    const promoCode: string | undefined = body?.promoCode;
    const returnPath: string =
      typeof body?.returnPath === "string" && body.returnPath.startsWith("/")
        ? body.returnPath
        : "/compte";

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://unpro.ca";
    const serviceClient = createClient(supabaseUrl, serviceKey);

    // ── Identify the user (optional for guest checkout) ──
    let userId: string | null = null;
    let userEmail: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (!authErr && user) {
        userId = user.id;
        userEmail = user.email ?? null;
      }
    }

    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    // ── Billing portal (manage / cancel an existing homeowner subscription) ──
    if (mode === "portal") {
      if (!userId) return json({ error: "Connexion requise." }, 401);
      if (!customerId) {
        const { data: sub } = await serviceClient
          .from("homeowner_subscriptions")
          .select("stripe_customer_id")
          .eq("user_id", userId)
          .not("stripe_customer_id", "is", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        customerId = sub?.stripe_customer_id ?? undefined;
      }
      if (!customerId) return json({ error: "Aucun abonnement actif trouvé." }, 404);

      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}${returnPath}`,
      });
      return json({ url: portal.url });
    }

    // ── Checkout ──
    if (!planCode || !CATALOG_CODE[planCode]) {
      return json({ error: "Plan invalide. Choisissez 'plus' ou 'signature'." }, 400);
    }

    // Authoritative price: the plan catalog (`plans`), with a static fallback.
    const { data: catalogPlan } = await serviceClient
      .from("plans")
      .select("code, name, stripe_yearly_price_id, active")
      .eq("code", CATALOG_CODE[planCode])
      .maybeSingle();

    const priceId = catalogPlan?.stripe_yearly_price_id || FALLBACK_PRICES[planCode];
    if (!priceId) return json({ error: "Tarif indisponible pour ce plan." }, 500);
    if (catalogPlan && catalogPlan.active === false) {
      return json({ error: "Ce plan n'est plus disponible." }, 400);
    }

    const successUrl =
      `${origin}/proprietaire/bienvenue?session_id={CHECKOUT_SESSION_ID}` +
      `&plan=${planCode}&return=${encodeURIComponent(returnPath)}`;
    const cancelUrl = `${origin}/upgrade?canceled=1&return=${encodeURIComponent(returnPath)}`;

    const metadata: Record<string, string> = {
      plan_code: planCode,
      plan_catalog_code: CATALOG_CODE[planCode],
      plan_type: "homeowner",
      return_path: returnPath,
      ...(userId ? { user_id: userId } : {}),
    };

    const checkoutConfig: any = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      currency: "cad",
      locale: "fr-CA",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      subscription_data: { metadata },
      allow_promotion_codes: !promoCode,
    };

    if (customerId) checkoutConfig.customer = customerId;
    else if (userEmail) checkoutConfig.customer_email = userEmail;

    if (promoCode && promoCode.trim()) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: promoCode.trim().toUpperCase(),
          active: true,
          limit: 1,
        });
        if (promoCodes.data.length > 0) {
          checkoutConfig.discounts = [{ promotion_code: promoCodes.data[0].id }];
          checkoutConfig.allow_promotion_codes = false;
        } else {
          checkoutConfig.allow_promotion_codes = true;
        }
      } catch (e) {
        console.error("[create-homeowner-checkout] promo lookup failed", e);
        checkoutConfig.allow_promotion_codes = true;
      }
    }

    const session = await stripe.checkout.sessions.create(checkoutConfig);

    if (userId) {
      // One pending row per user+plan — replayable without duplicating history.
      const { data: existing } = await serviceClient
        .from("homeowner_subscriptions")
        .select("id, status")
        .eq("user_id", userId)
        .eq("plan_code", planCode)
        .in("status", ["pending", "incomplete"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const payload = {
        user_id: userId,
        plan_code: planCode,
        status: "pending",
        stripe_checkout_session_id: session.id,
        stripe_customer_id: customerId ?? null,
        promo_code: promoCode?.trim().toUpperCase() || null,
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        await serviceClient.from("homeowner_subscriptions").update(payload).eq("id", existing.id);
      } else {
        await serviceClient.from("homeowner_subscriptions").insert(payload);
      }
    }

    return json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    console.error("[create-homeowner-checkout] error", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
