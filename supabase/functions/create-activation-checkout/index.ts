// Stripe checkout for the invited UNPRO entry: 350 $ CA + taxes per year
// (profile + 12 months of AI Presence, manual renewal, never automatic).
// The legacy 1 $ activation offer is obsolete and MUST NOT be reintroduced.
// Public endpoint, but never a metadata-only payment: the payer is the canonical
// prospect resolved server-side from an exact, valid token. Without that identity
// the request is refused BEFORE Stripe and sent to the canonical sign-in/entry path.
// One payable session per prospect (or proven existing contractor) and Stripe mode,
// through the shared reservation (same rules as create-checkout-session).
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { OFFER } from "../_shared/offerCopy.ts";
import { resolveStripeEnv, stripeKeyFor } from "../_shared/stripeEnv.ts";
import { ensureQuebecTaxRates, entry350TaxCollectionApproved, ENTRY350_TAX_CONTRACT, ENTRY350_AMOUNTS } from "../_shared/entry350Tax.ts";
import { resolveInvitedCheckoutOrigin } from "../_shared/checkoutGuards.ts";
import { resolveInvitedIdentity } from "../_shared/invitedIdentity.ts";
import { decideAnnualPresence, HISTORICAL_REVIEW_MESSAGE } from "../_shared/annualPresence.ts";
import {
  acquireCheckoutReservation, attachCheckoutSession, expireUndeliverable, liveProspectReservationDeps,
  liveReservationDeps, purchaseFingerprint, releaseIfNotCreated, stepKey,
} from "../_shared/checkoutReservation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Libellés Stripe : 350 $ par année + taxes, 12 mois, renouvellement manuel (jamais automatique). */
const INVITED_STRIPE_COPY = {
  productName: "UNPRO — Présence IA 12 mois (350 $ CA par année + taxes)",
  intentDescription: "UNPRO — Présence IA 12 mois, 350 $ CA par année + taxes. Renouvellement manuel, jamais automatique.",
  submitMessage: "350 $ CA par année, avant taxes. TPS : 17,50 $; TVQ : 34,91 $; total : 402,41 $ CA. Couvre 12 mois; renouvellement manuel, jamais automatique. Profil UNPRO + 12 mois de Présence IA; aucun rendez-vous inclus ou garanti.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { slug, email, source, utm, landing_token, activation_token, plan_code, quote_id, ref, test_mode } = (body ?? {}) as {
      slug?: string; email?: string; source?: string; utm?: Record<string, string>; landing_token?: string; activation_token?: string; plan_code?: string; quote_id?: string; ref?: string; test_mode?: boolean;
    };
    const stripeEnv = resolveStripeEnv(test_mode);
    if (!entry350TaxCollectionApproved(stripeEnv === "test" && stripeKeyFor("test") ? "test" : "live")) return json({ error: "Le paiement de cette offre n'est pas encore ouvert. Rien n'a été facturé.", code: "entry350_live_not_released" }, 503);

    // This invited CAD350 entry purchase grants 12 months of UNPRO presence,
    // with zero included exclusive appointments. A quote requires its own
    // separately reviewed offer/fulfillment path; never merge quote promises
    // into an ordinary CAD350 checkout or its signed-webhook metadata.
    if (typeof quote_id === "string" && quote_id.trim()) {
      return json({ error: "quote_requires_separate_checkout", next_path: "/entrepreneur/devis-personnalise" }, 409);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── CANONICAL IDENTITY (before any Stripe object) ───────────────────────
    const identity = await resolveInvitedIdentity(supabase, { activation_token, landing_token });
    if (!identity.ok) return json({ error: identity.message, code: identity.code, next_path: identity.next_path }, identity.status);
    const prospectId = identity.prospectId;
    const stripeMode: "live" | "test" = stripeEnv === "test" ? "test" : "live";

    // Existing contractor proven: same annual Presence decision and same lock as
    // every other contractor checkout — never a second Presence between circuits.
    if (identity.contractorId) {
      const { data: decision, error: decisionErr } = await supabase.rpc("annual_presence_decision", {
        _contractor_id: identity.contractorId, _include_test: stripeMode === "test",
      });
      const presence = decisionErr ? null : decideAnnualPresence({ rpc: decision, preRuleProposal: false });
      if (!presence) return json({ error: "Impossible de vérifier votre Présence IA. Aucun paiement n'a été créé.", code: "annual_presence_unverified" }, 503);
      if (presence.blocked) return json({ error: HISTORICAL_REVIEW_MESSAGE, code: "historical_right_review_required", next_path: "/login" }, 409);
      if (!presence.include) {
        return json({ error: "Votre Présence IA est encore valide. Connectez-vous à votre espace. Aucun paiement n'a été créé.", code: "annual_presence_still_valid", valid_until: presence.validUntil, next_path: "/login" }, 409);
      }
    }

    // ── AFFILIATE ATTRIBUTION ───────────────────────────────────────────────
    // ?ref=CODE carried from the affiliate audit link. Resolved server-side
    // against an ACTIVE affiliate; only a real match reaches Stripe metadata,
    // where stripe-webhook records the 20 % direct commission (+5 % override).
    let affiliateRefCode = "";
    let affiliateRefId = "";
    if (typeof ref === "string" && ref.trim()) {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("id, referral_code")
        .eq("referral_code", ref.trim().toUpperCase())
        .eq("status", "active")
        .maybeSingle();
      if (aff) {
        affiliateRefCode = aff.referral_code as string;
        affiliateRefId = aff.id as string;
      }
    }

    // Attribution is read from the DATABASE ROW, never from the request body.
    let attr: {
      acquisition_origin: string | null; agent_run_id: string | null; agent_name: string | null;
      agent_version: string | null; attribution_key: string | null; outreach_variant: string | null; human_unpro_touches: number;
    } = {
      acquisition_origin: null, agent_run_id: null, agent_name: null,
      agent_version: null, attribution_key: null, outreach_variant: null, human_unpro_touches: 0,
    };
    let outreachCampaignId = "";
    if (identity.prospectTable === "verified_contractor_prospects") {
      const { data: tk } = await supabase
        .from("verified_prospect_tokens")
        .select("acquisition_origin, agent_run_id, agent_name, agent_version, attribution_key, outreach_variant, human_unpro_touches")
        .eq("token", activation_token)
        .maybeSingle();
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
    } else {
      const { data: p } = await supabase.from("prospects").select("campaign_id").eq("id", prospectId).maybeSingle();
      outreachCampaignId = ((p as any)?.campaign_id as string) ?? "";
      await supabase.from("prospects").update({ funnel_status: "checkout_started" }).eq("id", prospectId);
    }

    const isActivation = identity.prospectTable === "verified_contractor_prospects";
    const isOutreach = !isActivation;
    const effectiveSlug = (typeof slug === "string" && slug.trim()) ? slug.trim().slice(0, 120)
      : isActivation ? `activation-${prospectId}` : `outreach-${prospectId}`;

    // Canonical instrumentation — the CTA click is recorded SERVER-SIDE so the
    // funnel can never show more checkouts than CTA clicks (client beacons drop).
    const ctaTrackingId = (isActivation ? activation_token : landing_token) || null;
    if (ctaTrackingId) {
      try {
        await supabase.rpc("record_engagement_event", {
          _event_type: "activation_cta_clicked",
          _channel: "web",
          _status: "activation_cta_clicked",
          _provider: "app",
          _tracking_id: ctaTrackingId,
          _prospect_id: prospectId,
          _source_table: isActivation ? "verified_prospect_tokens" : "prospects",
          _source_row_id: ctaTrackingId,
          _metadata: {
            surface: isActivation ? "unpro_activate" : "invitation_activate",
            source: source ?? null,
          },
          _idempotency_key: `activation_cta_clicked:${ctaTrackingId}`,
        });
      } catch (_) { /* never block the payment */ }
    }

    const stripeKey = stripeKeyFor(stripeEnv);
    if (!stripeKey) {
      return json({ error: stripeEnv === "test" ? "stripe_test_not_configured" : "stripe_not_configured", stage: "stripe_init" }, 500);
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Never trust a caller-supplied Origin for LIVE Stripe success/cancel URLs.
    const origin = resolveInvitedCheckoutOrigin(req.headers.get("origin"), stripeEnv);
    const successPath = isActivation
      ? `/activation-success?session_id={CHECKOUT_SESSION_ID}&slug=${encodeURIComponent(effectiveSlug)}`
      : `/activation/success?session_id={CHECKOUT_SESSION_ID}&token=${encodeURIComponent(landing_token || "")}`;
    const cancelPath = isActivation
      ? `/unpro/activate/${encodeURIComponent(activation_token || "")}?canceled=1`
      : `/invitation/${encodeURIComponent(landing_token || "")}/activate?cancelled=true`;

    const packPriceCents = OFFER.price_cents;

    const baseMetadata: Record<string, string> = {
      // REQUIRED by stripe-unpro-webhook (checkUnproMetadata). Without these
      // two keys every activation payment is quarantined and never recorded.
      platform: "unpro",
      brand: "unpro",
      offer_code: "contractor_entry_pack_350",
      activation_type: "activation_pack_350",
      plan_code: plan_code ?? "",
      quote_id: "",
      guaranteed_appointments: "",
      prospect_slug: effectiveSlug,
      prospect_id: prospectId,
      prospect_table: identity.prospectTable,
      campaign_id: outreachCampaignId,
      landing_token: isOutreach ? (landing_token ?? "") : "",
      activation_token: isActivation ? (activation_token ?? "") : "",
      offer: "entry_pack_350",
      entry_tax_contract: ENTRY350_TAX_CONTRACT,
      // No appointment package is sold through this base-entry path.
      offer_kind: "",
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
      // Affiliate attribution (server-resolved, never trusted from the client).
      ref: affiliateRefCode,
      affiliate_id: affiliateRefId,
      // "test" only when the caller explicitly asked for a Stripe test checkout.
      stripe_env: stripeEnv,
    };

    // deno-lint-ignore no-explicit-any
    const checkoutConfig: Record<string, any> = {
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
        tax_rates: await ensureQuebecTaxRates(stripe),
        price_data: {
          currency: "cad",
          unit_amount: packPriceCents,
          product_data: {
            name: INVITED_STRIPE_COPY.productName,
            description: OFFER.payment_note,
          },
        },
      }],
      payment_intent_data: { description: INVITED_STRIPE_COPY.intentDescription },
      custom_text: { submit: { message: INVITED_STRIPE_COPY.submitMessage } },
    };

    // ── ONE PAYABLE SESSION (reservation before any Stripe object) ──────────
    // Same request (same params) → same session or same Stripe idempotency key.
    const fingerprint = await purchaseFingerprint({ circuit: "invited_entry_350", stripeMode, config: checkoutConfig });
    const deps = identity.contractorId
      ? liveReservationDeps(supabase, stripe, {
        contractorId: identity.contractorId, stripeMode, kind: "entry_350", includesPresence: true, quoteId: null, fingerprint,
      })
      : liveProspectReservationDeps(supabase, stripe, {
        prospectTable: identity.prospectTable, prospectId, stripeMode, fingerprint,
      });
    const acquired = await acquireCheckoutReservation(deps, { embedded: false });
    if (acquired.kind === "refuse") return json({ error: acquired.message, code: acquired.code }, acquired.status);
    if (acquired.kind === "reuse") return json({ url: acquired.session.url, session_id: acquired.session.id, reused: true });

    checkoutConfig.metadata = { ...baseMetadata, checkout_reservation_id: acquired.reservationId };
    // The session can never outlive its reservation.
    checkoutConfig.expires_at = acquired.expiresAt;

    let session;
    try {
      session = await stripe.checkout.sessions.create(checkoutConfig, { idempotencyKey: stepKey(acquired.idempotencyKey, "session") });
    } catch (stripeErr: unknown) {
      console.error("[create-activation-checkout] stripe_create_failed");
      // Released only on proven non-creation of a never-used reservation.
      await releaseIfNotCreated(deps, acquired.reservationId, acquired.fresh, stripeErr, "stripe_rejected");
      return json({ error: "stripe_error", stage: "stripe_create" }, 502);
    }

    const undelivered = (outcome: "released" | "blocked") => json(outcome === "released"
      ? { error: "checkout_record_unavailable", stage: "persist", code: "checkout_reservation_unavailable" }
      : { error: "checkout_record_unavailable", stage: "persist", code: "checkout_reconciliation_pending" }, 503);

    const attached = await attachCheckoutSession(deps, acquired.reservationId, session);
    if (!attached.ok) {
      console.error("[create-activation-checkout] session_persist_failed");
      return undelivered(attached.expired ? "released" : "blocked");
    }

    // REVENUE-CRITICAL: persist the session so click -> checkout -> paid is
    // reconcilable without calling Stripe. Do not release the payable URL or
    // record a created-checkout event when this durable write fails.
    // Upsert: a safe retry returns the same Stripe session.
    try {
      const { error: persistError } = await supabase.from("billing_checkout_sessions").upsert({
        stripe_checkout_session_id: session.id,
        amount_total: session.amount_total,
        currency: "cad",
        checkout_status: "open",
        payment_status: "unpaid",
        plan_code: plan_code ?? "entry_pack_350",
        acquisition_origin: attr.acquisition_origin,
        agent_run_id: attr.agent_run_id,
        activation_token: isActivation ? (activation_token ?? null) : null,
        attribution_key: attr.attribution_key,
        prospect_id: prospectId,
        contractor_id: identity.contractorId,
        metadata_json: {
          entry_tax_contract: ENTRY350_TAX_CONTRACT,
          amount_subtotal: ENTRY350_AMOUNTS.subtotal,
          amount_tax: ENTRY350_AMOUNTS.tax,
          prospect_id: prospectId,
          prospect_table: identity.prospectTable,
          stripe_mode: stripeMode,
          checkout_reservation_id: acquired.reservationId,
          activation_token: isActivation ? (activation_token ?? null) : null,
          landing_token: isOutreach ? (landing_token ?? null) : null,
          slug: effectiveSlug,
          campaign_id: outreachCampaignId || null,
          source: source ?? null,
          checkout_url: session.url ?? null,
        },
      }, { onConflict: "stripe_checkout_session_id" });
      if (persistError) {
        console.error("[create-activation-checkout] session_persist_failed");
        return undelivered(await expireUndeliverable(deps, acquired.reservationId, session.id, "billing_record_failed"));
      }
    } catch (_e) {
      console.error("[create-activation-checkout] session_persist_failed");
      return undelivered(await expireUndeliverable(deps, acquired.reservationId, session.id, "billing_record_failed"));
    }

    // Canonical funnel event — checkout durably recorded (step 3/5).
    // `checkout_opened` is kept for legacy dashboards.
    try {
      const evtBase = {
        _channel: "web",
        _provider: "stripe",
        _tracking_id: ctaTrackingId,
        _prospect_id: prospectId,
        _destination_url: session.url ?? null,
        _source_table: "stripe_checkout_sessions",
        _source_row_id: session.id,
        _metadata: {
          campaign_id: outreachCampaignId || null,
          slug: effectiveSlug,
          amount_cents: packPriceCents,
          offer_code: "contractor_entry_pack_350",
        },
      };
      await supabase.rpc("record_engagement_event", {
        ...evtBase,
        _event_type: "stripe_checkout_created",
        _status: "stripe_checkout_created",
        _idempotency_key: `stripe_checkout_created:${session.id}`,
      });
      await supabase.rpc("record_engagement_event", {
        ...evtBase,
        _event_type: "checkout_opened",
        _status: "checkout_opened",
        _idempotency_key: `checkout_opened:${session.id}`,
      });
    } catch (_) { /* ignore */ }

    // Best-effort event log (table may not exist in all envs).
    try {
      await supabase.from("prospect_page_events").insert({
        slug: effectiveSlug, event_type: "checkout_started", metadata: { session_id: session.id, landing_token: isOutreach ? (landing_token ?? null) : null },
      });
    } catch (_) { /* ignore */ }

    return json({ url: session.url, session_id: session.id });
  } catch (_e: unknown) {
    console.error("[create-activation-checkout] fatal");
    return json({ error: "internal_error", stage: "fatal" }, 500);
  }
});
