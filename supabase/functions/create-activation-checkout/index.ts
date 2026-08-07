// Create a Stripe one-time checkout for the 1$/7d activation offer.
// Public: prospects can pay before having an account (email collected by Stripe).
// Never block a payment because of an internal lookup — proceed with metadata only.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVATION_PRICE_ID = "price_1TZD1rCvZwK1QnPVPZEGhJrs";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { slug, email, source, utm, landing_token, activation_token } = (body ?? {}) as {
      slug?: string; email?: string; source?: string; utm?: Record<string, string>; landing_token?: string; activation_token?: string;
    };

    // NEW: sms_outreach flow — resolve prospect via landing_token
    let outreachProspectId = "";
    let outreachCampaignId = "";
    let outreachSlug = slug;

    // /unpro/activate/:token flow — resolve the verified prospect from the SMS token.
    let activationProspectId = "";
    if (activation_token) {
      const svc = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: tk } = await svc
        .from("verified_prospect_tokens")
        .select("prospect_id")
        .eq("token", activation_token)
        .maybeSingle();
      if (tk?.prospect_id) {
        activationProspectId = tk.prospect_id as string;
        outreachSlug = outreachSlug || `activation-${activationProspectId}`;
      }
    }

    if (landing_token) {
      const supabaseEarly = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: p } = await supabaseEarly
        .from("prospects")
        .select("id, campaign_id, business_name, email")
        .eq("landing_token", landing_token)
        .maybeSingle();
      if (p) {
        outreachProspectId = p.id as string;
        outreachCampaignId = (p.campaign_id as string) ?? "";
        outreachSlug = outreachSlug || `outreach-${p.id}`;
        // Mark checkout_started
        await supabaseEarly.from("prospects").update({ funnel_status: "checkout_started" }).eq("id", p.id);
      }
    }

    if (!outreachSlug) return json({ error: "missing_slug", stage: "validate" }, 400);
    const effectiveSlug = outreachSlug;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const isSprint =
      source === "isolation-qc" ||
      String(effectiveSlug).startsWith("sprint-") ||
      String(effectiveSlug).startsWith("isolation-");
    const isOutreach = source === "sms_outreach" || !!landing_token;

    // Best-effort prospect lookup — never block checkout if not found.
    let prospectId = outreachProspectId || activationProspectId;
    if (!isSprint && !prospectId) {
      try {
        const wp = await supabase
          .from("war_prospects").select("id").eq("slug", effectiveSlug).maybeSingle();
        if (wp.data?.id) prospectId = wp.data.id as string;
        if (!prospectId) {
          const legacy = await supabase
            .from("prospect_pages").select("id").eq("slug", effectiveSlug).maybeSingle();
          if (legacy.data?.id) prospectId = legacy.data.id as string;
        }
      } catch (_) { /* soft-fail — proceed to Stripe anyway */ }
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "stripe_not_configured", stage: "stripe_init" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const origin = req.headers.get("origin") || "https://unpro.ca";
    const successPath = activation_token
      ? `/activation-success?session_id={CHECKOUT_SESSION_ID}&slug=${encodeURIComponent(effectiveSlug)}`
      : isOutreach
        ? `/activation/success?session_id={CHECKOUT_SESSION_ID}&token=${encodeURIComponent(landing_token || "")}`
        : isSprint
          ? `/activation-success?session_id={CHECKOUT_SESSION_ID}&source=isolation-qc`
          : `/activation-success?session_id={CHECKOUT_SESSION_ID}&slug=${encodeURIComponent(effectiveSlug)}`;
    const cancelPath = activation_token
      ? `/unpro/activate/${encodeURIComponent(activation_token)}?canceled=1`
      : isOutreach
        ? `/invitation/${encodeURIComponent(landing_token || "")}/activate?cancelled=true`
        : isSprint
          ? `/isolation-qc?canceled=1`
          : `/pro/${encodeURIComponent(effectiveSlug)}?canceled=1`;

    // ── $1 entry offer ─────────────────────────────────────────────────────
    // When a plan is selected (plan_code or quote_id), the contractor pays 1 $
    // today and the chosen plan starts automatically after 7 days.
    // Without a plan, we keep the legacy one-time 1 $ activation (no renewal),
    // so every SMS link already in the wild keeps working exactly as promised.
    let trialPlan: {
      code: string;
      name: string;
      monthly_price: number;
      stripe_monthly_price_id: string | null;
    } | null = null;
    let resolvedQuoteId = quote_id ?? "";

    try {
      let wantedCode = plan_code ?? "";
      if (!wantedCode && quote_id) {
        const { data: q } = await supabase
          .from("contractor_pricing_quotes")
          .select("recommended_plan")
          .eq("id", quote_id)
          .maybeSingle();
        wantedCode = (q?.recommended_plan as string) ?? "";
      }
      if (wantedCode) {
        const { data: p } = await supabase
          .from("plans")
          .select("code,name,monthly_price,stripe_monthly_price_id")
          .eq("audience", "contractor")
          .eq("active", true)
          .eq("code", wantedCode)
          .maybeSingle();
        if (p?.stripe_monthly_price_id) trialPlan = p as typeof trialPlan;
      }
    } catch (_) { /* soft-fail — fall back to the one-time offer */ }

    const trialDays = 7;
    const baseMetadata: Record<string, string> = {
      // REQUIRED by stripe-unpro-webhook (checkUnproMetadata). Without these
      // two keys every activation payment is quarantined and never recorded.
      platform: "unpro",
      brand: "unpro",
      offer_code: "contractor_activation_1_dollar",
      activation_type: trialPlan ? "activation_trial_to_plan" : "activation_7d",
      plan_code: trialPlan?.code ?? "",
      quote_id: resolvedQuoteId,
      prospect_slug: effectiveSlug,
      prospect_id: prospectId,
      campaign_id: outreachCampaignId,
      landing_token: landing_token ?? "",
      activation_token: activation_token ?? "",
      offer: "activation_7d",
      source: source ?? (isOutreach ? "sms_outreach" : ""),
      campaign_variant: utm?.camp ?? "",
      utm_city: utm?.city ?? "",
      utm_company: utm?.company ?? "",
    };

    let session;
    try {
      const common = {
        customer_email: email || undefined,
        success_url: `${origin}${successPath}`,
        cancel_url: `${origin}${cancelPath}`,
        metadata: baseMetadata,
        // REVENUE-CRITICAL: Stripe Adaptive Pricing was showing a
        // "Choisir la devise — 0,74 $US / 1,00 $CA" selector with USD preselected
        // to Québec contractors on a 1 $ CA offer. It destroyed trust at the
        // exact moment of payment. CAD only, always.
        adaptive_pricing: { enabled: false },
        locale: "fr-CA" as const,
      };

      session = trialPlan
        ? await stripe.checkout.sessions.create({
            ...common,
            mode: "subscription",
            line_items: [{ price: trialPlan.stripe_monthly_price_id!, quantity: 1 }],
            subscription_data: {
              trial_period_days: trialDays,
              description: `UNPRO ${trialPlan.name} — 1 $ CA pour ${trialDays} jours, puis ${Math.round(trialPlan.monthly_price / 100)} $ CA / mois.`,
              metadata: baseMetadata,
            },
            custom_text: {
              submit: {
                message: `1 $ CA aujourd'hui. Votre plan ${trialPlan.name} (${Math.round(trialPlan.monthly_price / 100)} $ CA / mois) démarre dans ${trialDays} jours. Annulable en tout temps.`,
              },
            },
          })
        : await stripe.checkout.sessions.create({
            ...common,
            mode: "payment",
            line_items: [{
              quantity: 1,
              price_data: {
                currency: "cad",
                unit_amount: 100,
                product_data: {
                  name: "UNPRO — Activation 7 jours (paiement unique)",
                  description:
                    "1 $ aujourd'hui. Aucun renouvellement automatique. Vous choisirez votre plan pendant l'essai.",
                },
              },
            }],
            payment_intent_data: {
              description:
                "UNPRO Activation 7 jours — paiement unique de 1 $ CA. Aucun abonnement créé.",
            },
            custom_text: {
              submit: {
                message:
                  "Paiement unique de 1 $ CA. Aucun abonnement — vous choisirez votre plan pendant les 7 jours d'essai.",
              },
            },
          });


    } catch (stripeErr: any) {
      console.error("[create-activation-checkout] stripe_error", stripeErr?.message || stripeErr);
      return json({ error: "stripe_error", detail: stripeErr?.message || String(stripeErr), stage: "stripe_create" }, 502);
    }


    // Canonical funnel event — checkout opened.
    try {
      await supabase.rpc("record_engagement_event", {
        _event_type: "checkout_opened",
        _channel: "web",
        _status: "checkout_opened",
        _provider: "stripe",
        _prospect_id: prospectId || null,
        _destination_url: session.url ?? null,
        _source_table: "stripe_checkout_sessions",
        _source_row_id: session.id,
        _metadata: { campaign_id: outreachCampaignId ?? null, slug: effectiveSlug },
        _idempotency_key: `checkout_opened:${session.id}`,
      });
    } catch (_) { /* ignore */ }

    // Best-effort event log (table may not exist in all envs).
    try {
      await supabase.from("prospect_page_events").insert({
        slug: effectiveSlug, event_type: "checkout_started", metadata: { session_id: session.id, landing_token: landing_token ?? null },
      });
    } catch (_) { /* ignore */ }


    return json({ url: session.url, session_id: session.id });
  } catch (e: any) {
    console.error("[create-activation-checkout] fatal", e?.message || e);
    return json({ error: "internal_error", detail: e?.message || String(e), stage: "fatal" }, 500);
  }
});
