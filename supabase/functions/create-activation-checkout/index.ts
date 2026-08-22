// Create a Stripe one-time checkout for the UNPRO 350 $ entry pack.
// The legacy 1 $ activation offer is obsolete and MUST NOT be reintroduced.
// Public: prospects can pay before having an account (email collected by Stripe).
// Never block a payment because of an internal lookup — proceed with metadata only.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { OFFER } from "../_shared/offerCopy.ts";

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
    const { slug, email, source, utm, landing_token, activation_token, plan_code, quote_id } = (body ?? {}) as {
      slug?: string; email?: string; source?: string; utm?: Record<string, string>; landing_token?: string; activation_token?: string; plan_code?: string; quote_id?: string;
    };

    // NEW: sms_outreach flow — resolve prospect via landing_token
    let outreachProspectId = "";
    let outreachCampaignId = "";
    let outreachSlug = slug;

    // /unpro/activate/:token flow — resolve the verified prospect from the SMS token.
    // ATTRIBUTION IS READ FROM THE DATABASE ROW, NEVER FROM THE REQUEST BODY.
    let activationProspectId = "";
    let attr: {
      acquisition_origin: string | null;
      agent_run_id: string | null;
      agent_name: string | null;
      agent_version: string | null;
      attribution_key: string | null;
      outreach_variant: string | null;
      human_unpro_touches: number;
    } = {
      acquisition_origin: null, agent_run_id: null, agent_name: null,
      agent_version: null, attribution_key: null, outreach_variant: null, human_unpro_touches: 0,
    };
    if (activation_token) {
      const svc = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: tk } = await svc
        .from("verified_prospect_tokens")
        .select("prospect_id, acquisition_origin, agent_run_id, agent_name, agent_version, attribution_key, outreach_variant, human_unpro_touches")
        .eq("token", activation_token)
        .maybeSingle();
      if (tk?.prospect_id) {
        activationProspectId = tk.prospect_id as string;
        outreachSlug = outreachSlug || `activation-${activationProspectId}`;
      }
      if (tk) {
        attr = {
          acquisition_origin: (tk as any).acquisition_origin ?? null,
          agent_run_id: (tk as any).agent_run_id ?? null,
          agent_name: (tk as any).agent_name ?? null,
          agent_version: (tk as any).agent_version ?? null,
          attribution_key: (tk as any).attribution_key ?? null,
          outreach_variant: (tk as any).outreach_variant ?? null,
          human_unpro_touches: Number((tk as any).human_unpro_touches ?? 0),
        };
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

    // ── Offre d'entrée 350 $ (paiement unique) ─────────────────────────────
    // L'offre 1 $ est OBSOLÈTE et interdite en recrutement. Toute activation
    // passe désormais par le pack d'entrée 350 $ : jusqu'à 5 rendez-vous
    // exclusifs garantis, aucun abonnement, aucun renouvellement automatique.
    const resolvedQuoteId = quote_id ?? "";
    let guaranteedAppointments: number | null = null;
    let packPriceCents = OFFER.price_cents;

    try {
      if (quote_id) {
        const { data: q } = await supabase
          .from("contractor_pricing_quotes")
          .select("guaranteed_appointments, total_price_cents")
          .eq("id", quote_id)
          .maybeSingle();
        if (q?.guaranteed_appointments) {
          guaranteedAppointments = Math.min(Number(q.guaranteed_appointments), OFFER.max_appointments);
        }
        if (q?.total_price_cents && Number(q.total_price_cents) >= OFFER.price_cents) {
          packPriceCents = Number(q.total_price_cents);
        }
      }
    } catch (_) { /* soft-fail — pack d'entrée standard */ }

    const priceLabel = `${Math.round(packPriceCents / 100)} $`;
    const guaranteeLine = guaranteedAppointments
      ? `${guaranteedAppointments} rendez-vous exclusif${guaranteedAppointments > 1 ? "s" : ""} garanti${guaranteedAppointments > 1 ? "s" : ""}`
      : `Jusqu'à ${OFFER.max_appointments} rendez-vous exclusifs garantis`;

    const baseMetadata: Record<string, string> = {
      // REQUIRED by stripe-unpro-webhook (checkUnproMetadata). Without these
      // two keys every activation payment is quarantined and never recorded.
      platform: "unpro",
      brand: "unpro",
      offer_code: "contractor_entry_pack_350",
      activation_type: "activation_pack_350",
      plan_code: plan_code ?? "",
      quote_id: resolvedQuoteId,
      guaranteed_appointments: guaranteedAppointments ? String(guaranteedAppointments) : "",
      prospect_slug: effectiveSlug,
      prospect_id: prospectId,
      campaign_id: outreachCampaignId,
      landing_token: landing_token ?? "",
      activation_token: activation_token ?? "",
      offer: "entry_pack_350",
      source: source ?? (isOutreach ? "sms_outreach" : ""),
      campaign_variant: utm?.camp ?? "",
      utm_city: utm?.city ?? "",
      utm_company: utm?.company ?? "",
      // ── AI revenue attribution (server-bound, DB-derived) ────────────────
      acquisition_origin: attr.acquisition_origin ?? "",
      agent_run_id: attr.agent_run_id ?? "",
      agent_name: attr.agent_name ?? "",
      agent_version: attr.agent_version ?? "",
      attribution_key: attr.attribution_key ?? "",
      outreach_variant: attr.outreach_variant ?? "",
      human_unpro_touches: String(attr.human_unpro_touches ?? 0),
    };

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        customer_email: email || undefined,
        success_url: `${origin}${successPath}`,
        cancel_url: `${origin}${cancelPath}`,
        metadata: baseMetadata,
        // REVENUE-CRITICAL: Stripe Adaptive Pricing showed a currency selector
        // with USD preselected to Québec contractors. CAD only, always.
        adaptive_pricing: { enabled: false },
        locale: "fr-CA" as const,
        mode: "payment",
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: packPriceCents,
            product_data: {
              name: `UNPRO — Pack d'entrée ${priceLabel} (paiement unique)`,
              description: `${guaranteeLine}. ${OFFER.payment_note}`,
            },
          },
        }],
        payment_intent_data: {
          description: `UNPRO — Pack d'entrée ${priceLabel} CA, paiement unique. ${guaranteeLine}.`,
        },
        custom_text: {
          submit: {
            message: `Paiement unique de ${priceLabel} CA. Aucun abonnement. ${guaranteeLine}.`,
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

    // REVENUE-CRITICAL: persist the session so click -> checkout -> paid is
    // reconcilable without calling Stripe. Without this row the funnel between
    // the activation page and the payment is invisible.
    try {
      await supabase.from("billing_checkout_sessions").insert({
        stripe_checkout_session_id: session.id,
        amount_total: packPriceCents,
        currency: "cad",
        checkout_status: "open",
        payment_status: "unpaid",
        plan_code: plan_code ?? "entry_pack_350",
        acquisition_origin: attr.acquisition_origin,
        agent_run_id: attr.agent_run_id,
        activation_token: activation_token ?? null,
        attribution_key: attr.attribution_key,
        prospect_id: prospectId || null,
        metadata_json: {
          prospect_id: prospectId || null,
          activation_token: activation_token ?? null,
          landing_token: landing_token ?? null,
          slug: effectiveSlug,
          campaign_id: outreachCampaignId || null,
          source: source ?? null,
          checkout_url: session.url ?? null,
        },
      });
    } catch (e) {
      console.error("[create-activation-checkout] session_persist_failed", e);
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
