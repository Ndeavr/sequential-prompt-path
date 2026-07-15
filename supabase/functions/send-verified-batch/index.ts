/**
 * send-verified-batch
 * Send up to N real SMS to strictly filtered verified prospects.
 * Blocks any prospect that is not sms_eligible / not mobile / lacks source.
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

function randToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 22);
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit ?? 10), 25);
    const dryRun = body.dry_run !== false ? true : false; // default DRY RUN — must pass dry_run:false to actually send

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      throw new FunctionError("Backend credentials missing: SUPABASE_URL or service role key", 500, "missing_backend_credentials");
    }

    const supabase = createClient(url, serviceKey);

    // Tier-based filter (A = mobile, B = VoIP SMS-capable, C = verified+unknown w/ quality>=80). D = email-only, excluded here.
    const { data: pool, error } = await supabase
      .from("verified_contractor_prospects")
      .select("id, business_name, phone_e164, phone_validation_status, phone_line_type, sms_eligibility_tier, sms_eligibility_confidence, data_quality_score, website_url, city, outreach_status, verification_status")
      .in("sms_eligibility_tier", ["A", "B", "C"])
      .eq("outreach_status", "none")
      .eq("verification_status", "verified")
      .gte("data_quality_score", 80)
      .not("phone_e164", "is", null)
      .not("website_url", "is", null)
      .order("sms_eligibility_tier", { ascending: true })
      .order("data_quality_score", { ascending: false })
      .limit(limit);
    if (error) throw new FunctionError(error.message, 500, "eligible_query_failed");

    const eligible = pool ?? [];
    if (dryRun) {
      const { data: blocked } = await supabase
        .from("verified_contractor_prospects")
        .select("id, business_name, verification_status, phone_validation_status, phone_line_type, sms_eligibility_tier, sms_eligibility_confidence, eligibility_reason, data_quality_score, website_url, outreach_status, outreach_failure_reason")
        .eq("outreach_status", "none")
        .order("data_quality_score", { ascending: false })
        .limit(20);

      const blockers = (blocked ?? []).map((p: any) => {
        let reason = "eligible";
        if (!p.website_url) reason = "missing_website_url";
        else if (p.verification_status !== "verified") reason = `not_verified:${p.verification_status}`;
        else if (p.data_quality_score < 80) reason = `quality_below_80:${p.data_quality_score}`;
        else if (!["A", "B", "C"].includes(p.sms_eligibility_tier ?? "")) {
          reason = `tier_blocked:${p.sms_eligibility_tier ?? "none"}:${p.eligibility_reason ?? "unknown"}`;
        }
        return {
          id: p.id, business_name: p.business_name, reason,
          verification_status: p.verification_status,
          sms_eligibility_tier: p.sms_eligibility_tier,
          sms_eligibility_confidence: p.sms_eligibility_confidence,
          eligibility_reason: p.eligibility_reason,
          phone_validation_status: p.phone_validation_status,
          phone_line_type: p.phone_line_type,
          data_quality_score: p.data_quality_score,
          failure: p.outreach_failure_reason,
        };
      }).filter((p: any) => p.reason !== "eligible");

      return jsonResponse({
        ok: true, dry_run: true, eligible_count: eligible.length, eligible,
        blockers,
        message: eligible.length > 0 ? `${eligible.length} prospect(s) prêt(s) (tiers A/B/C)` : "Aucun prospect ne passe les critères d'envoi réel",
      }, 200, requestId);
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER") || Deno.env.get("TWILIO_FROM_NUMBER");
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
      throw new FunctionError("Twilio credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER)", 500, "missing_twilio_credentials");
    }

    const origin = req.headers.get("origin") || "https://unpro.ca";
    const results: Array<Record<string, unknown>> = [];

    for (const p of eligible) {
      // Hard guardrails
      if (!p.phone_e164 || /555\d{4}$/.test(p.phone_e164)) {
        results.push({ id: p.id, skipped: "invalid_phone" });
        continue;
      }
      const token = randToken();
      const { error: tokenErr } = await supabase.from("verified_prospect_tokens").insert({ token, prospect_id: p.id });
      if (tokenErr) {
        results.push({ id: p.id, status: "failed", error: `token_create_failed: ${tokenErr.message}` });
        continue;
      }
      const link = `${origin}/unpro/activate/${token}`;
      const message = SMS_TEMPLATE(p.business_name, link);

      const twResp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          },
          body: new URLSearchParams({
            To: p.phone_e164, From: TWILIO_FROM, Body: message,
          }),
        },
      );
      const twBody = await twResp.text();
      if (twResp.ok) {
        const parsed = JSON.parse(twBody);
        await supabase.from("verified_contractor_prospects").update({
          outreach_status: "sent",
          outreach_twilio_sid: parsed.sid,
          outreach_sent_at: new Date().toISOString(),
          last_action_at: new Date().toISOString(),
        }).eq("id", p.id);
        await logPipelineEvent({
          prospect_id: p.id, business_name: p.business_name, city: p.city, category: (p as any).category,
          source: (p as any).source, stage: "contacted", metadata: { sid: parsed.sid, channel: "sms" },
        });
        results.push({ id: p.id, sid: parsed.sid, to: p.phone_e164, status: "sent" });
      } else {
        await supabase.from("verified_contractor_prospects").update({
          outreach_status: "failed",
          outreach_failure_reason: twBody.slice(0, 500),
          rejection_reason_code: REASON.sms_not_eligible,
          rejection_reason_text: twBody.slice(0, 300),
          last_action_at: new Date().toISOString(),
        }).eq("id", p.id);
        await logPipelineEvent({
          prospect_id: p.id, business_name: p.business_name, city: p.city, category: (p as any).category,
          source: (p as any).source, stage: "rejected", reason_code: REASON.sms_not_eligible,
          reason_text: twBody.slice(0, 300),
        });
        results.push({ id: p.id, status: "failed", error: twBody.slice(0, 200) });
      }
    }

    return jsonResponse({ ok: true, dry_run: false, sent: results.filter(r => r.status === "sent").length, processed: results.length, results }, 200, requestId);
  } catch (e) {
    const err = e instanceof FunctionError ? e : new FunctionError((e as Error).message);
    console.error(`[${requestId}] ${FUNCTION_NAME} failed`, { code: err.code, status: err.status, message: err.message });
    return jsonResponse({ ok: false, code: err.code, message: err.message, error: err.message }, err.status, requestId);
  }
});
