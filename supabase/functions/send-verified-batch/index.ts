/**
 * send-verified-batch
 * Send up to N real SMS to strictly filtered verified prospects.
 * Blocks any prospect that is not sms_eligible / not mobile / lacks source.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    // STRICT filter
    const { data: pool, error } = await supabase
      .from("verified_contractor_prospects")
      .select("id, business_name, phone_e164, phone_validation_status, sms_eligible, data_quality_score, website_url, city, outreach_status")
      .eq("sms_eligible", true)
      .eq("outreach_status", "none")
      .gte("data_quality_score", 80)
      .not("phone_e164", "is", null)
      .not("website_url", "is", null)
      .in("phone_validation_status", ["valid_mobile", "valid_sms_capable_voip"])
      .order("data_quality_score", { ascending: false })
      .limit(limit);
    if (error) throw new FunctionError(error.message, 500, "eligible_query_failed");

    const eligible = pool ?? [];
    if (dryRun) {
      return jsonResponse({
        ok: true, dry_run: true, eligible_count: eligible.length, eligible,
        message: eligible.length > 0 ? `${eligible.length} prospect(s) prêt(s)` : "Aucun prospect ne passe les critères d'envoi réel",
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
        }).eq("id", p.id);
        results.push({ id: p.id, sid: parsed.sid, to: p.phone_e164, status: "sent" });
      } else {
        await supabase.from("verified_contractor_prospects").update({
          outreach_status: "failed",
          outreach_failure_reason: twBody.slice(0, 500),
        }).eq("id", p.id);
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
