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

    let session;
    try {
      session = await stripe.checkout.sessions.create({
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
        customer_email: email || undefined,
        success_url: `${origin}${successPath}`,
        cancel_url: `${origin}${cancelPath}`,
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
        metadata: {
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
        },
        locale: "fr",
      });
    } catch (stripeErr: any) {
      console.error("[create-activation-checkout] stripe_error", stripeErr?.message || stripeErr);
      return json({ error: "stripe_error", detail: stripeErr?.message || String(stripeErr), stage: "stripe_create" }, 502);
    }


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
