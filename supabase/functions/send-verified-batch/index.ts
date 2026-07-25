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
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logPipelineEvent, REASON } from "../_shared/acquisitionPipeline.ts";

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

const SMS_TEMPLATE = (biz: string, link: string) =>
  `Bonjour ${biz}, UNPRO a préparé gratuitement un profil pour votre entreprise afin que les propriétaires et les IA puissent mieux comprendre vos services. Les 10 premières entreprises peuvent l'activer pour 1 $ : ${link}`;

const EMAIL_SUBJECT = (biz: string) =>
  `${biz} — votre profil UNPRO est prêt (activation 1 $)`;

const EMAIL_HTML = (biz: string, link: string) => `
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f0;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;padding:32px;max-width:560px;">
          <tr><td>
            <p style="font-size:14px;color:#666;margin:0 0 16px 0;letter-spacing:0.06em;text-transform:uppercase;">UNPRO — Concierge Décisif</p>
            <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px 0;color:#111;">Bonjour ${biz},</h1>
            <p style="font-size:16px;line-height:1.55;margin:0 0 16px 0;">UNPRO a préparé gratuitement un profil pour votre entreprise afin que les propriétaires et les IA de recherche puissent mieux comprendre vos services au Québec.</p>
            <p style="font-size:16px;line-height:1.55;margin:0 0 24px 0;">Les <strong>10 premières entreprises</strong> peuvent l'activer pour <strong>1 $</strong>.</p>
            <p style="margin:0 0 24px 0;">
              <a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:600;font-size:16px;">Activer mon profil (1 $)</a>
            </p>
            <p style="font-size:13px;line-height:1.5;color:#666;margin:0 0 0 0;">Ou copiez ce lien dans votre navigateur :<br /><a href="${link}" style="color:#666;">${link}</a></p>
          </td></tr>
        </table>
        <p style="font-size:12px;color:#999;margin:16px 0 0 0;">UNPRO — plateforme d'intelligence résidentielle québécoise · unpro.ca</p>
      </td></tr>
    </table>
  </body>
</html>`;

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

async function ensureActivationLink(
  supabase: ReturnType<typeof createClient>,
  origin: string,
  prospectId: string,
): Promise<{ token: string; link: string; error?: string }> {
  const token = randToken();
  const { error } = await supabase.from("verified_prospect_tokens").insert({ token, prospect_id: prospectId });
  if (error) return { token, link: "", error: `token_create_failed: ${error.message}` };
  return { token, link: `${origin}/unpro/activate/${token}` };
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
    const prospectIds: string[] | null = Array.isArray(body.prospect_ids) && body.prospect_ids.length > 0
      ? body.prospect_ids.map(String)
      : null;
    const limit = Math.min(Number(body.limit ?? (prospectIds?.length ?? 10)), 50);
    const dryRun = body.dry_run !== false ? true : false;

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
      .select("id, business_name, phone_e164, phone_validation_status, phone_line_type, sms_eligibility_tier, sms_eligibility_confidence, data_quality_score, website_url, city, category, source, email, outreach_status, verification_status, retry_count")
      .eq("outreach_status", "none")
      .eq("verification_status", "verified")
      .gte("data_quality_score", 80)
      .not("website_url", "is", null)
      .or("sms_eligibility_tier.in.(A,B,C),and(sms_eligibility_tier.eq.D,email.not.is.null),and(sms_eligibility_tier.is.null,email.not.is.null)")
      .order("sms_eligibility_tier", { ascending: true, nullsFirst: false })
      .order("data_quality_score", { ascending: false })
      .limit(limit);
    if (prospectIds) query = query.in("id", prospectIds);
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
          .select("id, business_name, city, category, source, verification_status, phone_line_type, sms_eligibility_tier, outreach_status, data_quality_score, website_url, email, eligibility_reason")
          .in("id", missingIds);
        for (const p of skipped ?? []) {
          let reason = "unknown_ineligibility";
          if (!p.website_url) reason = "missing_website_url";
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
    if (dryRun) {
      const previews = eligible.map((p: any) => {
        const smsEligibleTier = ["A", "B", "C"].includes(p.sms_eligibility_tier ?? "");
        return {
          id: p.id,
          business_name: p.business_name,
          tier: p.sms_eligibility_tier,
          phone_line_type: p.phone_line_type,
          has_email: !!p.email,
          channel_planned: smsEligibleTier ? "sms" : (p.email ? "email" : "none"),
        };
      });
      return jsonResponse({
        ok: true, dry_run: true, eligible_count: eligible.length, eligible: previews,
        skipped: missingResults,
        message: eligible.length > 0 ? `${eligible.length} prospect(s) prêt(s)` : "Aucun prospect éligible",
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
      const smsEligibleTier = ["A", "B", "C"].includes(p.sms_eligibility_tier ?? "");
      const hasValidPhone = !!p.phone_e164 && !/555\d{4}$/.test(p.phone_e164);
      const shouldTrySms = smsEligibleTier && hasValidPhone && hasTwilio;

      // Build a single activation link both channels will share.
      const { token, link, error: linkErr } = await ensureActivationLink(supabase, origin, p.id);
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
        const message = SMS_TEMPLATE(p.business_name, link);
        const twResp = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
            },
            body: new URLSearchParams({ To: p.phone_e164, From: TWILIO_FROM!, Body: message }),
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
