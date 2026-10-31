import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Server-side tier map (authoritative). Base prices are before taxes.
const TIERS = [
  { min: 2, max: 4, priceId: "price_1TAaMwCvZwK1QnPVFcqGb0fG" },
  { min: 5, max: 10, priceId: "price_1TAaMyCvZwK1QnPVzMClie4G" },
  { min: 11, max: 20, priceId: "price_1TAaMzCvZwK1QnPVkLBKyI5R" },
  { min: 21, max: 50, priceId: "price_1TAaN0CvZwK1QnPV3G4aIEgk" },
  { min: 51, max: 100, priceId: "price_1TAaN1CvZwK1QnPVXSpL8Yso" },
  { min: 101, max: 9999, priceId: "price_1TAaN2CvZwK1QnPVg8FJ8NS3" },
];
const MANAGER_ROLES = ["owner", "board_member", "manager", "administrator"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "payment_unavailable", message: "Paiement temporairement indisponible." }, 503);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "unauthenticated" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: u } = await admin.auth.getUser(token);
    const user = u?.user;
    if (!user?.email) return json({ error: "unauthenticated" }, 401);

    // Client authority is limited to the syndicate id; priceId/amount from body are ignored.
    const body = await req.json().catch(() => ({}));
    const syndicateId = typeof body?.syndicateId === "string" ? body.syndicateId : "";
    const portfolioId = typeof body?.portfolioId === "string" ? body.portfolioId : "";
    const kind: "condo" | "portfolio" = portfolioId ? "portfolio" : "condo";
    const targetId = kind === "portfolio" ? portfolioId : syndicateId;
    if (!UUID.test(targetId)) return json({ error: "target_required", message: "Immeuble ou portefeuille requis avant le paiement." }, 400);

    let doors = 0;
    if (kind === "condo") {
      const { data: member } = await admin.from("syndicate_members").select("role")
        .eq("syndicate_id", syndicateId).eq("user_id", user.id).eq("is_active", true).maybeSingle();
      if (!member || !MANAGER_ROLES.includes(String(member.role))) return json({ error: "forbidden" }, 403);
      const { data: syn } = await admin.from("syndicates").select("id, unit_count").eq("id", syndicateId).maybeSingle();
      doors = Number(syn?.unit_count);
      const { data: existing } = await admin.from("condo_subscriptions").select("status").eq("syndicate_id", syndicateId).maybeSingle();
      if (existing && ["active", "trialing", "past_due"].includes(String(existing.status))) return json({ error: "already_subscribed", message: "Cet immeuble a déjà un abonnement." }, 409);
    } else {
      const { data: pf } = await admin.from("portfolios").select("id, user_id, total_doors").eq("id", portfolioId).maybeSingle();
      if (!pf || pf.user_id !== user.id) return json({ error: "forbidden" }, 403);
      doors = Number(pf.total_doors);
      const { data: existing } = await admin.from("portfolio_subscriptions").select("status").eq("portfolio_id", portfolioId).maybeSingle();
      if (existing && ["active", "past_due"].includes(String(existing.status))) return json({ error: "already_subscribed", message: "Ce portefeuille a déjà un abonnement." }, 409);
    }
    if (!Number.isInteger(doors) || doors < 2 || doors > 9999) return json({ error: "invalid_door_count", message: "Nombre de portes invalide." }, 400);
    const tier = TIERS.find((t) => doors >= t.min && doors <= t.max);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    if (!Deno.env.get("STRIPE_CONDO_WEBHOOK_SECRET")) {
      return json({ error: "webhook_not_configured", message: "Paiement temporairement indisponible : confirmation des paiements à configurer." }, 503);
    }

    // Tax gate: base prices are before taxes. Require an active Stripe Tax registration in Canada.
    const regs = await stripe.tax.registrations.list({ status: "active", limit: 100 });
    const caRegistered = regs.data.some((r) => r.country === "CA");
    if (!caRegistered) {
      console.log("[CONDO-CHECKOUT] blocked: no active CA tax registration");
      return json({ error: "tax_not_configured", message: "Paiement temporairement indisponible : taxes à configurer." }, 503);
    }

    const priceId = tier?.priceId ?? "";
    if (!priceId) return json({ error: "price_unavailable", message: "Paiement temporairement indisponible." }, 503);

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id ?? (await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } })).id;

    const origin = req.headers.get("origin") || "https://unpro.ca";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      automatic_tax: { enabled: true },
      customer_update: { address: "auto" },
      success_url: kind === "portfolio" ? `${origin}/gestionnaires/portefeuille?checkout=success` : `${origin}/condos/billing?checkout=success`,
      cancel_url: kind === "portfolio" ? `${origin}/gestionnaires/portefeuille?checkout=cancelled` : `${origin}/condos/billing?checkout=cancelled`,
      metadata: kind === "portfolio"
        ? { supabase_user_id: user.id, portfolio_id: portfolioId, product_type: "portfolio_premium", doors: String(doors) }
        : { supabase_user_id: user.id, syndicate_id: syndicateId, product_type: "condo_premium", doors: String(doors) },
      subscription_data: { metadata: kind === "portfolio" ? { portfolio_id: portfolioId, product_type: "portfolio_premium" } : { syndicate_id: syndicateId, product_type: "condo_premium" } },
    }, { idempotencyKey: `${kind}-${targetId}-${priceId}-${new Date().toISOString().slice(0, 13)}` });

    if (kind === "portfolio") {
      await admin.from("portfolio_subscriptions").upsert({
        portfolio_id: portfolioId, user_id: user.id, doors, price_id: priceId, status: "pending",
        stripe_customer_id: customerId, stripe_checkout_session_id: session.id, updated_at: new Date().toISOString(),
      }, { onConflict: "portfolio_id" });
    }

    return json({ url: session.url });
  } catch (e) {
    console.error("[CONDO-CHECKOUT] error", e instanceof Error ? e.message : e);
    return json({ error: "checkout_failed", message: "Le paiement n'a pas pu être préparé. Réessayez." }, 500);
  }
});
