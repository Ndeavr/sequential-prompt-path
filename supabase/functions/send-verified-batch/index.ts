/**
 * send-verified-batch
 *
 * Sends outreach to verified prospects using a two-channel strategy:
 *   1. If the prospect is on tier A / B / C (SMS-eligible), attempt Twilio SMS.
 *   2. If SMS is not eligible (tier D landline, or no tier) OR the Twilio send
 *      fails with a fallback-eligible error (undeliverable to this line), send
 *      the same activation message by email via `outreach-resend-send`.
 *   3. A prospect is only marked `failed` when both channels fail, or when SMS
 *      fails and there is no email address on file.
 *
 * The pipeline never quarantines a prospect simply because Twilio Line Type
 * Intelligence could not classify their number.
 *
 * SMS first-touch copy is score-first (curiosity → free personalized AI
 * score, no pricing/payment/subscription language) and points at
 * /unpro/audit/:token, which resolves the canonical token and lands the
 * prospect directly on their personalized Audit IA. Email keeps the
 * canonical $350 golden path (/unpro/activate/:token).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildOutreachUrl, smsWithLink } from "../_shared/outreachLink.ts";
import { logPipelineEvent, REASON } from "../_shared/acquisitionPipeline.ts";
import { firstTouchScoreSms, emailSubject, emailHtml } from "../_shared/offerCopy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FUNCTION_NAME = "send-verified-batch";

class FunctionError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 500, code = "function_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200, requestId = crypto.randomUUID()) {
  return new Response(JSON.stringify({ function: FUNCTION_NAME, request_id: requestId, ...body }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId },
  });
}

/**
 * First-touch SMS — score-first. The link targets /unpro/audit/:token (the
 * personalized Audit IA) instead of the $350 activation landing, and the
 * copy never mentions pricing, payment, subscription, or guaranteed
 * appointment counts.
 */
const FIRST_TOUCH_CAMPAIGN = "ai_score_first_touch";
const SMS_TEMPLATE = (biz: string, auditLink: string) =>
  smsWithLink(
    firstTouchScoreSms(biz),
    buildOutreachUrl(auditLink, { campaign: FIRST_TOUCH_CAMPAIGN }),
  );

/** Compliance guard: first-touch SMS must never carry commercial/pricing terms. */
const FORBIDDEN_FIRST_TOUCH = /(350|\$\s?\d|prix|paiement|abonnement|forfait|rendez-vous garantis|garanti)/i;
const safeFirstTouchBody = (biz: string, personalized: string | null, auditLink: string) => {
  const link = buildOutreachUrl(auditLink, { campaign: FIRST_TOUCH_CAMPAIGN });
  if (personalized && !FORBIDDEN_FIRST_TOUCH.test(personalized)) {
    return smsWithLink(personalized, link);
  }
  return smsWithLink(firstTouchScoreSms(biz), link);
};

const EMAIL_SUBJECT = (biz: string) => emailSubject(biz);

const EMAIL_HTML = (biz: string, link: string) => emailHtml(biz, link);

// Twilio error codes for which SMS should NOT be retried and email fallback is preferred.
const FALLBACK_ELIGIBLE_TWILIO_CODES = new Set<number>([
  21211, // Invalid 'To' number
  21408, // Permission to send SMS not enabled
  21610, // Recipient opted out
  21612, // Not routable
  21614, // 'To' number not a valid mobile
  30003, // Unreachable destination handset
  30004, // Message blocked
  30005, // Unknown destination handset
  30006, // Landline / unreachable carrier
  30007, // Carrier violation
  30008, // Unknown error
]);

function extractTwilioErrorCode(twBody: string): number | null {
  try {
    const parsed = JSON.parse(twBody);
    const c = parsed?.code;
    return typeof c === "number" ? c : null;
  } catch {
    return null;
  }
}

function randToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 22);
}

export interface AgentAttribution {
  acquisition_origin: string;      // 'ai_agent' | 'automation'
  agent_name: string;
  agent_version: string;
  agent_run_id: string | null;
  agent_session_id: string | null;
  outreach_variant: string | null;
}

async function ensureActivationLink(
  supabase: ReturnType<typeof createClient>,
  origin: string,
  prospectId: string,
  campaignId?: string | null,
  attribution?: AgentAttribution | null,
): Promise<{ token: string; link: string; attribution_key?: string; error?: string }> {
  const token = randToken();
  const attributionKey = attribution ? `${attribution.acquisition_origin}:${token}` : null;
  const { error } = await supabase
    .from("verified_prospect_tokens")
    .insert({
      token,
      prospect_id: prospectId,
      campaign_id: campaignId ?? null,
      ...(attribution
        ? {
          acquisition_origin: attribution.acquisition_origin,
          agent_name: attribution.agent_name,
          agent_version: attribution.agent_version,
          agent_run_id: attribution.agent_run_id,
          agent_session_id: attribution.agent_session_id,
          outreach_variant: attribution.outreach_variant,
          first_touch_source: attribution.acquisition_origin,
          last_touch_source: attribution.acquisition_origin,
          attribution_key: attributionKey,
        }
        : {}),
    });
  if (error) return { token, link: "", error: `token_create_failed: ${error.message}` };
  return { token, link: `${origin}/unpro/activate/${token}`, attribution_key: attributionKey ?? undefined };
}



async function sendEmailViaResend(
  url: string,
  serviceKey: string,
  args: { to: string; businessName: string; link: string; prospectId: string },
): Promise<{ ok: boolean; message_id?: string; resend_id?: string; error?: string }> {
  try {
    const r = await fetch(`${url}/functions/v1/outreach-resend-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        to: args.to,
        subject: EMAIL_SUBJECT(args.businessName),
        html: EMAIL_HTML(args.businessName, args.link),
        cta_url: args.link,
        template_name: "acquisition_onboarding_v1",
        message_id: `acq-${args.prospectId}-${Date.now()}`,
        tags: { prospect_id: args.prospectId, template: "acquisition_onboarding_v1" },
      }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body?.ok === false) {
      return { ok: false, error: String(body?.detail ?? body?.reason ?? `HTTP ${r.status}`) };
    }
    return { ok: true, message_id: body?.message_id, resend_id: body?.resend_id };
  } catch (e) {
    return { ok: false, error: String((e as Error).message ?? e) };
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const campaignId: string | null = typeof body.campaign_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.campaign_id)
      ? body.campaign_id
      : null;
    const prospectIds: string[] | null = Array.isArray(body.prospect_ids) && body.prospect_ids.length > 0
      ? body.prospect_ids.map(String)
      : null;
    const limit = Math.min(Number(body.limit ?? (prospectIds?.length ?? 10)), 50);
    const dryRun = body.dry_run !== false ? true : false;
    // Opt-in email-only wave: used for prospects whose SMS channel is proven
    // dead (landline 30006 / A2P 30034). Never sends SMS in this mode.
    const forceEmail = String(body.channel ?? "").toLowerCase() === "email";
    // Optional geographic / trade scoping used by recruitment-orchestrator.
    // `region` is the official registry region (Novoclimat/RBQ), `city` the
    // municipality when the official record carries one.
    const filterCity = typeof body.city === "string" && body.city.trim() ? body.city.trim() : null;
    const filterRegion = typeof body.region === "string" && body.region.trim() ? body.region.trim() : null;
    const filterCategory = typeof body.category === "string" && body.category.trim()
      ? body.category.trim().toLowerCase()
      : null;

    // Server-bound acquisition attribution. Supplied ONLY by trusted callers
    // (service-role automations such as ai-revenue-agent). Never derived from a
    // query string, never inferred at payment time.
    const attribution: AgentAttribution | null = body.attribution && typeof body.attribution === "object"
      ? {
        acquisition_origin: String(body.attribution.acquisition_origin ?? "automation"),
        agent_name: String(body.attribution.agent_name ?? "unknown-agent"),
        agent_version: String(body.attribution.agent_version ?? "v1"),
        agent_run_id: body.attribution.agent_run_id ? String(body.attribution.agent_run_id) : null,
        agent_session_id: body.attribution.agent_session_id ? String(body.attribution.agent_session_id) : null,
        outreach_variant: body.attribution.outreach_variant ? String(body.attribution.outreach_variant) : null,
      }
      : null;
    // Optional per-prospect message body produced by a model. The activation
    // link is always appended server-side — a model can never alter the CTA.
    const messageOverrides: Record<string, string> =
      body.message_overrides && typeof body.message_overrides === "object" ? body.message_overrides : {};


    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      throw new FunctionError("Backend credentials missing", 500, "missing_backend_credentials");
    }

    const supabase = createClient(url, serviceKey);

    // Broadened filter: SMS-eligible tiers (A/B/C) OR tier D / no-tier with an
    // email on file (email-only fallback path).
    let query = supabase
      .from("verified_contractor_prospects")
      .select("id, business_name, phone_e164, phone_validation_status, phone_line_type, sms_eligibility_tier, sms_eligibility_confidence, data_quality_score, website_url, google_business_url, google_place_id, phone_source_url, city, category, source, email, outreach_status, verification_status, retry_count, email_eligible, email_eligibility_reason, email_sent_at, source_urls")
      .eq("verification_status", "verified")
      .gte("data_quality_score", 80)
      // CASL provenance gate: a standalone website is NOT required, but a
      // verifiable public business source is. Any of website / Google Business
      // listing / Google place id / documented phone source URL qualifies.
      // An official public registry URL (e.g. RBQ / Novoclimat / REQ lists)
      // persisted in source_urls.official_registry also qualifies — it is a
      // real public source, never fabricated.
      .or("website_url.not.is.null,google_business_url.not.is.null,google_place_id.not.is.null,phone_source_url.not.is.null,source_urls->>official_registry.not.is.null")
      .order("sms_eligibility_tier", { ascending: true, nullsFirst: false })
      .order("data_quality_score", { ascending: false })
      .limit(limit);

    if (forceEmail) {
      // A hard-failed SMS attempt never reached a human, so these rows stay
      // contactable on the email channel only. Prospects whose SMS line is
      // carrier-proven dead carry email_eligible=true and may be emailed even
      // when their monotonic outreach_status (sent/delivered/clicked) cannot
      // be downgraded — the trigger preserves it. Terminal states excluded.
      query = query
        .or("outreach_status.in.(none,failed),email_eligible.eq.true")
        .not("email", "is", null)
        .or("outreach_status.is.null,outreach_status.not.in.(registered,payment_started,paid,activated)");
    } else {
      query = query
        .eq("outreach_status", "none")
        .or("sms_eligibility_tier.in.(A,B,C),and(sms_eligibility_tier.eq.D,email.not.is.null),and(sms_eligibility_tier.is.null,email.not.is.null)");
    }
    if (prospectIds) query = query.in("id", prospectIds);
    if (filterCity) query = query.ilike("city", `${filterCity}%`);
    if (filterRegion) query = query.ilike("region", filterRegion);
    if (filterCategory) query = query.ilike("category", `%${filterCategory}%`);

    const { data: pool, error } = await query;
    if (error) throw new FunctionError(error.message, 500, "eligible_query_failed");

    // Log any explicitly-requested prospect ids that didn't make the pool.
    const missingResults: Array<Record<string, unknown>> = [];
    if (prospectIds) {
      const returnedIds = new Set((pool ?? []).map((r: any) => r.id));
      const missingIds = prospectIds.filter((id) => !returnedIds.has(id));
      if (missingIds.length > 0) {
        const { data: skipped } = await supabase
          .from("verified_contractor_prospects")
          .select("id, business_name, city, category, source, verification_status, phone_line_type, sms_eligibility_tier, outreach_status, data_quality_score, website_url, google_business_url, google_place_id, phone_source_url, email, eligibility_reason, source_urls")
          .in("id", missingIds);
        for (const p of skipped ?? []) {
          let reason = "unknown_ineligibility";
          const hasProvenance = Boolean(
            p.website_url || p.google_business_url || p.google_place_id || p.phone_source_url
              || (p.source_urls as any)?.official_registry,
          );
          if (!hasProvenance) reason = "missing_public_provenance";
          else if (p.verification_status !== "verified") reason = `not_verified:${p.verification_status ?? "null"}`;
          else if ((p.data_quality_score ?? 0) < 80) reason = `quality_below_80:${p.data_quality_score}`;
          else if (p.outreach_status !== "none") reason = `already_${p.outreach_status}`;
          else if (!["A", "B", "C"].includes(p.sms_eligibility_tier ?? "") && !p.email) reason = `no_channel_available:tier=${p.sms_eligibility_tier ?? "none"}_no_email`;

          await supabase
            .from("verified_contractor_prospects")
            .update({
              rejection_reason_code: reason,
              rejection_reason_text: reason,
              last_action_at: new Date().toISOString(),
            })
            .eq("id", p.id);
          await logPipelineEvent({
            prospect_id: p.id,
            business_name: p.business_name,
            city: p.city,
            category: p.category,
            source: p.source,
            stage: "quarantined",
            reason_code: reason,
            reason_text: reason,
            metadata: {
              verification_status: p.verification_status,
              sms_eligibility_tier: p.sms_eligibility_tier,
              phone_line_type: p.phone_line_type,
              data_quality_score: p.data_quality_score,
              has_website: !!p.website_url,
              has_email: !!p.email,
            },
          });
          missingResults.push({ id: p.id, business_name: p.business_name, status: "skipped_by_gate", skipped: reason });
        }
      }
    }

    const eligible = pool ?? [];

    // ---------------------------------------------------------------
    // Cross-automation duplicate guard.
    // Several automations (acquisition-queue-worker, second-touch-outreach,
    // launch-agent-outreach, crm-automation-tick, solicitation-send-sms) can
    // legitimately target the same contractor. acq_sms_logs is the single
    // canonical send log, so it is the only safe place to detect an overlap.
    // Any phone already contacted inside the window is skipped here, whatever
    // automation produced that contact.
    // ---------------------------------------------------------------
    const DUP_GUARD_HOURS = Number(Deno.env.get("OUTREACH_DUP_GUARD_HOURS") ?? 24);
    const dupSince = new Date(Date.now() - DUP_GUARD_HOURS * 3600_000).toISOString();
    const phonesInBatch = eligible.map((p: any) => p.phone_e164).filter(Boolean).map(String);
    const idsInBatch = eligible.map((p: any) => p.id).filter(Boolean).map(String);
    const recentlyContactedPhones = new Set<string>();
    const recentlyContactedIds = new Set<string>();
    if (phonesInBatch.length > 0 || idsInBatch.length > 0) {
      const { data: recentLogs } = await supabase
        .from("acq_sms_logs")
        .select("recipient_phone, prospect_id, created_at")
        .gte("created_at", dupSince)
        // A message the carrier never delivered (undelivered/failed) never
        // reached a human — it is a non-contact and must not trip the guard.
        .or("status.is.null,status.not.in.(undelivered,failed)")
        .or(
          [
            phonesInBatch.length ? `recipient_phone.in.(${phonesInBatch.join(",")})` : null,
            idsInBatch.length ? `prospect_id.in.(${idsInBatch.join(",")})` : null,
          ].filter(Boolean).join(","),
        );
      for (const row of recentLogs ?? []) {
        if (row.recipient_phone) recentlyContactedPhones.add(String(row.recipient_phone));
        if (row.prospect_id) recentlyContactedIds.add(String(row.prospect_id));
      }
      // Same guard window on the email channel: acquisition emails carry
      // message_id `acq-<prospectId>-<ts>` in the canonical email_send_log.
      if (idsInBatch.length > 0) {
        const { data: recentEmails } = await supabase
          .from("email_send_log")
          .select("message_id, created_at")
          .gte("created_at", dupSince)
          .eq("status", "sent")
          .or(idsInBatch.map((id) => `message_id.like.acq-${id}-%`).join(","));
        for (const row of recentEmails ?? []) {
          const m = /^acq-([0-9a-fA-F-]{36})-/.exec(String(row.message_id ?? ""));
          if (m) recentlyContactedIds.add(m[1]);
        }
      }
    }
    const isRecentlyContacted = (p: any) =>
      recentlyContactedIds.has(String(p.id)) ||
      (!!p.phone_e164 && recentlyContactedPhones.has(String(p.phone_e164)));

    if (dryRun) {
      const previews = eligible.map((p: any) => {
        const smsEligibleTier = !forceEmail && ["A", "B", "C"].includes(p.sms_eligibility_tier ?? "");
        const dup = isRecentlyContacted(p);
        return {
          id: p.id,
          business_name: p.business_name,
          tier: p.sms_eligibility_tier,
          phone_line_type: p.phone_line_type,
          has_email: !!p.email,
          email_eligible: p.email_eligible === true,
          email_eligibility_reason: p.email_eligibility_reason ?? null,
          outreach_status: p.outreach_status,
          duplicate_guard: dup,
          channel_planned: dup ? "none" : (smsEligibleTier ? "sms" : (p.email ? "email" : "none")),
          skip_reason: dup ? `duplicate_recent_contact_${DUP_GUARD_HOURS}h` : null,
        };
      });
      const dupCount = previews.filter((p) => p.duplicate_guard).length;
      return jsonResponse({
        ok: true, dry_run: true, eligible_count: eligible.length - dupCount,
        duplicate_skipped_count: dupCount,
        eligible: previews,
        skipped: missingResults,
        message: eligible.length > 0 ? `${eligible.length - dupCount} prospect(s) prêt(s)` : "Aucun prospect éligible",
      }, 200, requestId);
    }


    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER") || Deno.env.get("TWILIO_FROM_NUMBER");
    // Twilio creds are only strictly required if any prospect goes down the SMS path.
    const hasTwilio = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM);

    const origin = req.headers.get("origin") || "https://unpro.ca";
    const results: Array<Record<string, unknown>> = [];

    for (const p of eligible) {
      // Hard stop: another automation already contacted this candidate inside
      // the guard window. No provider call, no log row, no second contact.
      if (isRecentlyContacted(p)) {
        results.push({
          id: p.id,
          business_name: p.business_name,
          status: "skipped_duplicate",
          skipped: `duplicate_recent_contact_${DUP_GUARD_HOURS}h`,
          channel_used: null,
        });
        continue;
      }
      const smsEligibleTier = !forceEmail && ["A", "B", "C"].includes(p.sms_eligibility_tier ?? "");
      const hasValidPhone = !!p.phone_e164 && !/555\d{4}$/.test(p.phone_e164);
      const shouldTrySms = smsEligibleTier && hasValidPhone && hasTwilio;


      // Build a single activation link both channels will share.
      const { token, link, error: linkErr } = await ensureActivationLink(supabase, origin, p.id, campaignId, attribution);
      const personalized = typeof messageOverrides[p.id] === "string" && messageOverrides[p.id].trim()
        ? messageOverrides[p.id].trim()
        : null;
      // SMS lands on the personalized Audit IA (score-first), email on the
      // canonical activation golden path.
      const auditLink = link.replace("/unpro/activate/", "/unpro/audit/");
      const smsBody = safeFirstTouchBody(p.business_name, personalized, auditLink);
      // Canonical selection event — proves the agent chose this prospect.
      if (attribution) {
        try {
          await supabase.rpc("record_engagement_event", {
            _event_type: "ai_selected",
            _channel: "system",
            _status: "ai_selected",
            _provider: attribution.agent_name,
            _tracking_id: token,
            _prospect_id: p.id,
            _source_table: "verified_prospect_tokens",
            _source_row_id: token,
            _metadata: {
              acquisition_origin: attribution.acquisition_origin,
              agent_run_id: attribution.agent_run_id,
              agent_name: attribution.agent_name,
              agent_version: attribution.agent_version,
              outreach_variant: attribution.outreach_variant,
              personalized: !!personalized,
            },
            _idempotency_key: `ai_selected:${token}`,
          });
        } catch (_) { /* never block a send on analytics */ }
      }
      if (linkErr) {
        results.push({ id: p.id, status: "failed", error: linkErr, channel_used: null });
        continue;
      }

      let channelUsed: "sms" | "email" | null = null;
      let smsSid: string | null = null;
      let twilioErrorCode: number | null = null;
      let smsErrorBody: string | null = null;
      let resendId: string | null = null;
      let emailError: string | null = null;
      let fallbackReason: string | null = null;
      let smsAttempted = false;

      // -------- SMS attempt --------
      if (shouldTrySms) {
        smsAttempted = true;
        const message = smsBody;
        const twResp = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
            },
            body: new URLSearchParams({
              To: p.phone_e164,
              From: TWILIO_FROM!,
              Body: message,
              StatusCallback:
                `${url}/functions/v1/engagement-webhook-twilio?prospect_id=${encodeURIComponent(p.id)}` +
                (campaignId ? `&campaign_id=${encodeURIComponent(campaignId)}` : ""),
            }),
          },
        );
        const twBody = await twResp.text();
        if (twResp.ok) {
          try { smsSid = JSON.parse(twBody)?.sid ?? null; } catch { /* keep null */ }
          channelUsed = "sms";
        } else {
          smsErrorBody = twBody.slice(0, 500);
          twilioErrorCode = extractTwilioErrorCode(twBody);
          fallbackReason = `sms_failed:${twilioErrorCode ?? twResp.status}`;
        }
      } else if (!smsEligibleTier) {
        fallbackReason = `tier_${p.sms_eligibility_tier ?? "none"}_email_only`;
      } else if (!hasValidPhone) {
        fallbackReason = "invalid_phone";
      } else if (!hasTwilio) {
        fallbackReason = "twilio_credentials_missing";
      }

      // -------- Email fallback --------
      const shouldTryEmail =
        !channelUsed && !!p.email && (
          !smsEligibleTier ||               // Tier D / no-tier: email is the primary channel
          !hasValidPhone ||                 // No usable phone
          !hasTwilio ||                     // Provider not configured
          (smsAttempted && (twilioErrorCode === null || FALLBACK_ELIGIBLE_TWILIO_CODES.has(twilioErrorCode ?? -1)))
        );

      if (shouldTryEmail) {
        // Unified suppression / opt-out gate (same suppression_index the
        // commercial-send-gate uses). A suppressed address is never emailed.
        const { data: isSuppressed } = await supabase
          .rpc("is_email_suppressed", { p_email: p.email });
        if (isSuppressed === true) {
          results.push({ id: p.id, business_name: p.business_name, status: "skipped", skipped: "email_suppressed", channel_used: null });
          continue;
        }
        // Email channel cooldown: at most one acquisition email per prospect
        // per 7 days, whatever automation produced the previous one.
        if (p.email_sent_at && Date.now() - new Date(p.email_sent_at).getTime() < 7 * 24 * 3600_000) {
          results.push({ id: p.id, business_name: p.business_name, status: "skipped", skipped: "email_cooldown_7d", channel_used: null });
          continue;
        }
        const emailRes = await sendEmailViaResend(url, serviceKey, {
          to: p.email!,
          businessName: p.business_name,
          link,
          prospectId: p.id,
        });
        if (emailRes.ok) {
          channelUsed = "email";
          resendId = emailRes.resend_id ?? emailRes.message_id ?? null;
        } else {
          emailError = emailRes.error ?? "unknown_email_error";
        }
      }

      // -------- Persist outcome --------
      const nowIso = new Date().toISOString();
      const prevRetry = Number((p as any).retry_count ?? 0);
      const fallbackTs = fallbackReason ? nowIso : null;
      if (channelUsed === "sms") {
        await supabase.from("verified_contractor_prospects").update({
          outreach_status: "sent",
          outreach_twilio_sid: smsSid,
          sms_provider_message_id: smsSid,
          outreach_sent_at: nowIso,
          channel_used: "sms",
          delivery_status: "sent",
          fallback_reason: null,
          fallback_timestamp: null,
          sms_error_code: null,
          sms_error_message: null,
          retry_count: prevRetry + 1,
          last_attempt_at: nowIso,
          last_action_at: nowIso,
        }).eq("id", p.id);
        await supabase.from("acq_sms_logs").insert({
          prospect_id: p.id,
          recipient_phone: String(p.phone_e164),
          body: smsBody,
          status: "sent",
          provider_message_id: smsSid,
          sent_at: nowIso,
          campaign_id: campaignId,
          relance_kind: "first_touch",
          message_purpose: "commercial_outreach",
        });
        await logPipelineEvent({
          prospect_id: p.id, business_name: p.business_name, city: p.city, category: p.category,
          source: p.source, stage: "contacted",
          metadata: { sid: smsSid, channel: "sms", token },
        });
        results.push({ id: p.id, sid: smsSid, to: p.phone_e164, status: "sent", channel_used: "sms" });
      } else if (channelUsed === "email") {
        await supabase.from("verified_contractor_prospects").update({
          outreach_status: "sent_email",
          email_provider_message_id: resendId,
          email_sent_at: nowIso,
          channel_used: "email",
          delivery_status: "sent_email",
          fallback_reason: fallbackReason,
          fallback_timestamp: fallbackTs,
          sms_error_code: twilioErrorCode != null ? String(twilioErrorCode) : null,
          sms_error_message: smsErrorBody,
          outreach_failure_reason: smsErrorBody, // preserve why SMS was skipped if applicable
          retry_count: prevRetry + 1,
          last_attempt_at: nowIso,
          last_action_at: nowIso,
        }).eq("id", p.id);
        await logPipelineEvent({
          prospect_id: p.id, business_name: p.business_name, city: p.city, category: p.category,
          source: p.source, stage: "contacted",
          metadata: {
            channel: "email",
            resend_id: resendId,
            fallback_reason: fallbackReason,
            twilio_error_code: twilioErrorCode,
            sms_attempted: smsAttempted,
          },
        });
        results.push({
          id: p.id, to: p.email, status: "sent", channel_used: "email",
          resend_id: resendId, fallback_reason: fallbackReason,
        });
      } else {
        // Both channels failed OR no channel available
        const finalErr = emailError
          ? `sms_and_email_failed:${fallbackReason ?? "n/a"}:email=${emailError}`
          : (smsErrorBody ?? fallbackReason ?? "no_channel_available");
        await supabase.from("verified_contractor_prospects").update({
          outreach_status: "failed",
          outreach_failure_reason: (smsErrorBody ?? emailError ?? finalErr).slice(0, 500),
          email_failure_reason: emailError,
          email_error_message: emailError,
          sms_error_code: twilioErrorCode != null ? String(twilioErrorCode) : null,
          sms_error_message: smsErrorBody,
          channel_used: null,
          delivery_status: "failed",
          fallback_reason: fallbackReason,
          fallback_timestamp: fallbackTs,
          retry_count: prevRetry + 1,
          last_attempt_at: nowIso,
          rejection_reason_code: REASON.sms_not_eligible,
          rejection_reason_text: finalErr.slice(0, 300),
          last_action_at: nowIso,
        }).eq("id", p.id);
        await logPipelineEvent({
          prospect_id: p.id, business_name: p.business_name, city: p.city, category: p.category,
          source: p.source, stage: "rejected", reason_code: REASON.sms_not_eligible,
          reason_text: finalErr.slice(0, 300),
          metadata: {
            sms_attempted: smsAttempted,
            twilio_error_code: twilioErrorCode,
            email_attempted: shouldTryEmail,
            email_error: emailError,
            fallback_reason: fallbackReason,
          },
        });
        results.push({
          id: p.id, status: "failed", error: finalErr.slice(0, 200), channel_used: null,
          fallback_reason: fallbackReason, twilio_error_code: twilioErrorCode, email_error: emailError,
        });
      }

      // Canonical outreach event for the AI attribution chain.
      if (attribution && channelUsed) {
        try {
          await supabase.rpc("record_engagement_event", {
            _event_type: channelUsed === "sms" ? "sms_sent" : "email_sent",
            _channel: channelUsed,
            _status: "sent",
            _provider: channelUsed === "sms" ? "twilio" : "resend",
            _tracking_id: token,
            _prospect_id: p.id,
            _source_table: "verified_prospect_tokens",
            _source_row_id: token,
            _metadata: {
              acquisition_origin: attribution.acquisition_origin,
              agent_run_id: attribution.agent_run_id,
              agent_name: attribution.agent_name,
              outreach_variant: attribution.outreach_variant,
              provider_message_id: channelUsed === "sms" ? smsSid : resendId,
            },
            _idempotency_key: `ai_outreach_sent:${token}`,
          });
        } catch (_) { /* analytics must never block revenue */ }
      }
    }



    const allResults = [...results, ...missingResults];
    const sent = allResults.filter((r) => r.status === "sent").length;
    const sentSms = allResults.filter((r) => r.status === "sent" && r.channel_used === "sms").length;
    const sentEmail = allResults.filter((r) => r.status === "sent" && r.channel_used === "email").length;
    return jsonResponse({
      ok: true, dry_run: false,
      sent, sent_sms: sentSms, sent_email: sentEmail,
      processed: allResults.length,
      results: allResults,
    }, 200, requestId);
  } catch (e) {
    const err = e instanceof FunctionError ? e : new FunctionError((e as Error).message);
    console.error(`[${requestId}] ${FUNCTION_NAME} failed`, { code: err.code, status: err.status, message: err.message });
    return jsonResponse({ ok: false, code: err.code, message: err.message, error: err.message }, err.status, requestId);
  }
});
