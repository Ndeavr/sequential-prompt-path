/**
 * UNPRO — Contractor Revenue Timeline (read-only).
 * Derives the canonical 13-stage revenue funnel for one contractor from real
 * database rows only. No writes. No provider calls. Admin visibility only.
 *
 * POST { query: string }  where query = business name fragment OR phone (E.164 or raw).
 * Returns { ok, subject, stages[], external_blockers[], sources }.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type StageStatus = "success" | "pending" | "failed" | "blocked" | "skipped" | "unknown";
type Stage = {
  key: string;
  label: string;
  status: StageStatus;
  timestamp?: string | null;
  reason_code?: string | null;
  explanation_fr: string;
  source: string;
  provider_id?: string | null;
  next_action?: string | null;
  retryable?: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const rawQuery = String(body?.query ?? "").trim();
    if (!rawQuery) {
      return json({ ok: false, error: "missing_query" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Normalize phone → E.164 CA best-effort
    const digits = rawQuery.replace(/\D/g, "");
    const e164 =
      digits.length === 11 && digits.startsWith("1") ? `+${digits}` :
      digits.length === 10 ? `+1${digits}` : null;

    // Fetch verified prospect (revenue-side source of truth)
    let vp: any = null;
    if (e164) {
      const r = await supabase.from("verified_contractor_prospects").select("*").eq("phone_e164", e164).limit(1);
      vp = r.data?.[0] ?? null;
    }
    if (!vp && !e164) {
      const r = await supabase.from("verified_contractor_prospects").select("*").ilike("business_name", `%${rawQuery}%`).limit(1);
      vp = r.data?.[0] ?? null;
    }

    // Fetch contractor_leads mirror
    let lead: any = null;
    if (vp) {
      const r = await supabase.from("contractor_leads").select("*").or(`phone.eq.${vp.phone_primary ?? vp.phone_e164},company_name.ilike.${vp.business_name}`).limit(1);
      lead = r.data?.[0] ?? null;
    } else {
      const r = await supabase.from("contractor_leads").select("*").ilike("company_name", `%${rawQuery}%`).limit(1);
      lead = r.data?.[0] ?? null;
    }

    if (!vp && !lead) {
      return json({ ok: false, error: "not_found", query: rawQuery }, 404);
    }

    const subject = {
      business_name: vp?.business_name ?? lead?.company_name ?? rawQuery,
      city: vp?.city ?? lead?.city ?? null,
      category: vp?.category ?? lead?.category_primary ?? null,
      phone_e164: vp?.phone_e164 ?? null,
      phone_display: vp?.phone_e164 ? maskPhone(vp.phone_e164) : (lead?.phone ?? null),
      website_url: vp?.website_url ?? lead?.website_url ?? null,
      source_url: vp?.phone_source_url ?? vp?.address_source_url ?? null,
      email: vp?.email ?? lead?.email ?? null,
      verified_prospect_id: vp?.id ?? null,
      contractor_lead_id: lead?.id ?? null,
    };

    // Pipeline events for this prospect
    const events = vp?.id
      ? (await supabase.from("acquisition_pipeline_events").select("stage, reason_code, reason_text, metadata, created_at").eq("prospect_id", vp.id).order("created_at", { ascending: true })).data ?? []
      : [];

    // Delivery logs by normalized phone
    const deliveryLogs = vp?.phone_e164
      ? (await supabase.from("outreach_delivery_logs").select("channel, provider, status, error_code, error_message, provider_message_id, created_at").eq("recipient_normalized", vp.phone_e164).order("created_at", { ascending: false }).limit(20)).data ?? []
      : [];

    // Checkout / subscription lookup — only if we have a contractor account linkage
    let checkout: any = null;
    let subscription: any = null;
    if (lead?.contractor_id) {
      const c = await supabase.from("checkout_sessions").select("checkout_status, external_checkout_id, final_total_after_discount, currency, created_at").eq("contractor_profile_id", lead.contractor_id).order("created_at", { ascending: false }).limit(1);
      checkout = c.data?.[0] ?? null;
      const s = await supabase.from("contractor_subscriptions").select("status, payment_status, amount_paid_cents, currency, activation_source, current_period_start, created_at").eq("contractor_id", lead.contractor_id).order("created_at", { ascending: false }).limit(1);
      subscription = s.data?.[0] ?? null;
    }

    const smsEvt = events.find((e: any) => e.stage === "contacted" && e.metadata?.channel === "sms");
    const twilioSid = smsEvt?.metadata?.sid ?? vp?.sms_provider_message_id ?? vp?.outreach_twilio_sid ?? null;
    const trackingToken = smsEvt?.metadata?.token ?? null;

    const stages: Stage[] = [];

    stages.push({
      key: "scraped",
      label: "Scraped",
      status: vp || lead ? "success" : "unknown",
      timestamp: vp?.created_at ?? lead?.created_at ?? null,
      explanation_fr: "Prospect découvert dans la base d'acquisition.",
      source: vp ? "verified_contractor_prospects" : "contractor_leads",
    });

    stages.push({
      key: "enriched",
      label: "Enrichi",
      status: vp?.last_enriched_at || vp?.website_url || vp?.email ? "success" : "pending",
      timestamp: vp?.last_enriched_at ?? null,
      explanation_fr: vp?.website_url ? "Site web et coordonnées confirmées." : "Enrichissement partiel : site web manquant.",
      source: "verified_contractor_prospects",
      next_action: vp?.website_url ? null : "Compléter enrichissement Firecrawl.",
      retryable: !vp?.website_url,
    });

    stages.push({
      key: "phone_validated",
      label: "Téléphone validé",
      status: vp?.verification_status === "verified" ? "success" : (vp ? "failed" : "unknown"),
      timestamp: vp?.verified_at ?? null,
      reason_code: vp?.phone_line_type ?? null,
      explanation_fr: vp?.phone_line_type === "unknown"
        ? "Twilio Lookup: line type inconnu (NPAC CA indisponible → Tier C)."
        : `Line type: ${vp?.phone_line_type ?? "inconnu"}.`,
      source: "twilio-lookup-phone → verified_contractor_prospects",
      provider_id: null,
      retryable: true,
    });

    stages.push({
      key: "casl_allowed",
      label: "CASL autorisé",
      status: vp && (vp.website_url || vp.phone_source_url || vp.address_source_url) ? "success" : "blocked",
      explanation_fr: vp?.website_url
        ? `Preuve publique : ${vp.website_url}`
        : "Aucune preuve CASL publique enregistrée sur le prospect.",
      source: "verified_contractor_prospects.website_url / *_source_url",
      next_action: vp?.website_url ? null : "Ajouter une URL source publique avant de recontacter.",
      retryable: !vp?.website_url,
    });

    stages.push({
      key: "sms_eligible",
      label: "SMS éligible",
      status: vp?.sms_eligible ? "success" : "blocked",
      reason_code: vp?.sms_eligibility_tier ?? null,
      explanation_fr: `Tier ${vp?.sms_eligibility_tier ?? "?"} — ${vp?.eligibility_reason ?? "non défini"}.`,
      source: "compute_sms_eligibility_tier",
    });

    stages.push({
      key: "sms_sent",
      label: "SMS envoyé",
      status: twilioSid ? "success" : (vp?.channel_used === "email" ? "skipped" : "pending"),
      timestamp: smsEvt?.created_at ?? vp?.outreach_sent_at ?? null,
      provider_id: twilioSid,
      explanation_fr: twilioSid ? `Envoyé via Twilio (${twilioSid}).` : "Aucun SMS émis.",
      source: "acquisition_pipeline_events{stage=contacted}",
      retryable: !twilioSid,
    });

    const lastDelivery = deliveryLogs[0];
    stages.push({
      key: "delivered",
      label: "Livré",
      status: lastDelivery?.status === "delivered" ? "success" : (twilioSid ? "pending" : "unknown"),
      timestamp: lastDelivery?.created_at ?? null,
      provider_id: lastDelivery?.provider_message_id ?? null,
      explanation_fr: lastDelivery
        ? `Callback Twilio: ${lastDelivery.status}${lastDelivery.error_code ? ` (${lastDelivery.error_code})` : ""}.`
        : "Aucun callback de livraison Twilio reçu.",
      source: "outreach_delivery_logs",
    });

    stages.push({
      key: "clicked",
      label: "Lien cliqué",
      status: vp?.outreach_clicked_at || lead?.clicked_at ? "success" : "pending",
      timestamp: vp?.outreach_clicked_at ?? lead?.clicked_at ?? null,
      explanation_fr: trackingToken ? `Token de tracking : /r/${trackingToken}` : "Aucun clic enregistré.",
      source: "verified_contractor_prospects.outreach_clicked_at",
    });

    stages.push({
      key: "registration_started",
      label: "Inscription",
      status: lead?.onboarding_started_at ? "success" : "pending",
      timestamp: lead?.onboarding_started_at ?? null,
      explanation_fr: lead?.onboarding_started_at ? "Onboarding démarré." : "Le prospect n'a pas ouvert l'inscription.",
      source: "contractor_leads.onboarding_started_at",
    });

    stages.push({
      key: "otp_verified",
      label: "OTP vérifié",
      status: lead?.contractor_id ? "success" : "pending",
      explanation_fr: lead?.contractor_id ? "Compte contractor lié." : "Aucun compte lié.",
      source: "contractor_leads.contractor_id",
    });

    stages.push({
      key: "checkout_created",
      label: "Checkout créé",
      status: checkout ? "success" : "pending",
      timestamp: checkout?.created_at ?? null,
      provider_id: checkout?.external_checkout_id ?? null,
      explanation_fr: checkout ? `Statut: ${checkout.checkout_status}` : "Aucune session de paiement créée.",
      source: "checkout_sessions",
    });

    const paid = subscription?.payment_status === "paid" || (subscription?.amount_paid_cents ?? 0) >= 100;
    stages.push({
      key: "paid_1_dollar",
      label: "Payé 1 $",
      status: paid ? "success" : "pending",
      timestamp: paid ? subscription?.current_period_start ?? subscription?.created_at ?? null : null,
      provider_id: subscription?.stripe_subscription_id ?? null,
      explanation_fr: paid ? `Paiement confirmé (${(subscription.amount_paid_cents ?? 0) / 100} ${subscription.currency ?? "CAD"}).` : "Aucun paiement Stripe confirmé.",
      source: "contractor_subscriptions",
    });

    stages.push({
      key: "activated",
      label: "Activé",
      status: subscription?.status === "active" || lead?.activation_status === "activated" ? "success" : "pending",
      explanation_fr: subscription?.status === "active" ? "Abonnement actif." : "Non activé.",
      source: "contractor_subscriptions.status",
    });

    // External blockers
    const externalBlockers: Array<Record<string, unknown>> = [];
    if (vp?.phone_line_type === "unknown") {
      externalBlockers.push({
        provider: "Twilio",
        code: "LTI_UNAVAILABLE",
        message: "Line Type Intelligence indisponible pour les numéros canadiens (NPAC).",
        account_setting: "Activer LTI Canada dans Twilio Console (ou continuer en Tier C avec fallback email).",
        affected_stage: "phone_validated",
        fallback_available: !!vp?.email,
      });
    }
    if (twilioSid && deliveryLogs.length === 0) {
      externalBlockers.push({
        provider: "Twilio",
        code: "NO_STATUS_CALLBACK",
        message: `SID ${twilioSid} envoyé mais aucun callback reçu dans outreach_delivery_logs.`,
        account_setting: "Réparer StatusCallback Twilio",
        affected_stage: "delivered",
        fallback_available: false,
      });
    }

    // Split next actions: conversion (revenue-blocking) vs technical (telemetry / config)
    const CONVERSION_KEYS = new Set([
      "sms_sent",
      "clicked",
      "registration_started",
      "otp_verified",
      "checkout_created",
      "paid_1_dollar",
      "activated",
    ]);
    const conversionStage = stages.find(
      (s) => CONVERSION_KEYS.has(s.key) && (s.status === "pending" || s.status === "blocked" || s.status === "failed"),
    );
    const CONVERSION_ACTION_FR: Record<string, string> = {
      sms_sent: "Envoyer le SMS d'activation",
      clicked: "Clic sur le lien d'activation",
      registration_started: "Attendre l'ouverture de l'inscription",
      otp_verified: "Attendre la vérification OTP",
      checkout_created: "Attendre l'ouverture du checkout Stripe",
      paid_1_dollar: "Attendre le paiement Stripe de 1 $ CAD",
      activated: "Finaliser l'activation contractor",
    };
    const conversionNextAction = conversionStage
      ? CONVERSION_ACTION_FR[conversionStage.key] ?? conversionStage.label
      : "Aucune action de conversion en attente.";

    const technicalNextAction = externalBlockers.length > 0
      ? String(externalBlockers[0].account_setting ?? externalBlockers[0].message ?? "Vérifier la configuration provider.")
      : null;

    return json({
      ok: true,
      subject,
      stages,
      external_blockers: externalBlockers,
      conversion_next_action: conversionNextAction,
      technical_next_action: technicalNextAction,
      // Deprecated field kept temporarily for older UI clients; do NOT rely on it.
      next_action: conversionNextAction,
      sources: {
        events_count: events.length,
        delivery_logs_count: deliveryLogs.length,
      },
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function maskPhone(e164: string): string {
  if (!e164 || e164.length < 6) return e164;
  return `${e164.slice(0, 3)}•••${e164.slice(-4)}`;
}
