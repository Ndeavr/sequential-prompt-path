/**
 * validate-contractor-phone
 * Normalize E.164 (CA only), call Twilio Lookup v2, set phone_validation_status + sms_eligible.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FUNCTION_NAME = "validate-contractor-phone";

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

function normalizeCA(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prospect_id } = await req.json().catch(() => ({}));
    if (!prospect_id) throw new FunctionError("prospect_id required", 400, "missing_prospect_id");

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      throw new FunctionError("Backend credentials missing: SUPABASE_URL or service role key", 500, "missing_backend_credentials");
    }

    const supabase = createClient(url, serviceKey);

    const { data: prospect, error: fetchErr } = await supabase
      .from("verified_contractor_prospects")
      .select("id, phone_primary, phone_secondary, verification_status, data_quality_score")
      .eq("id", prospect_id)
      .single();
    if (fetchErr || !prospect) throw new FunctionError(fetchErr?.message ?? "prospect not found", 404, "prospect_not_found");

    const raw = prospect.phone_primary || prospect.phone_secondary;
    if (!raw) throw new FunctionError("no phone to validate", 422, "missing_phone");
    const e164 = normalizeCA(raw);
    if (!e164) {
      await supabase.from("verified_contractor_prospects").update({
        phone_validation_status: "invalid",
        sms_eligible: false,
        outreach_failure_reason: "phone_invalid_format",
      }).eq("id", prospect_id);
      return jsonResponse({ ok: true, e164: null, status: "invalid", sms_eligible: false, message: "Format de téléphone invalide" }, 200, requestId);
    }
    if (/555\d{4}$/.test(e164)) {
      await supabase.from("verified_contractor_prospects").update({
        phone_validation_status: "invalid",
        sms_eligible: false,
        outreach_failure_reason: "placeholder_555",
      }).eq("id", prospect_id);
      return jsonResponse({ ok: true, e164, status: "invalid", sms_eligible: false, message: "Numéro placeholder bloqué" }, 200, requestId);
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    let line_type = "unknown";
    let status = "unverified";
    let lookupError: string | null = null;
    let lookupDetails: Record<string, unknown> | null = null;

    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 12000);
      const resp = await fetch(`https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence`, {
        headers: { Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`) },
        signal: ctrl.signal,
      });
      clearTimeout(timeout);
      const body = await resp.text();
      if (resp.ok) {
        try {
          const j = JSON.parse(body);
          const t = j?.line_type_intelligence?.type as string | undefined;
          lookupDetails = {
            valid: j?.valid,
            validation_errors: j?.validation_errors,
            line_type_intelligence: j?.line_type_intelligence ?? null,
          };
          if (t === "mobile") { line_type = "mobile"; status = "valid_mobile"; }
          else if (t === "nonFixedVoip") { line_type = "voip"; status = "valid_sms_capable_voip"; }
          else if (t === "fixedVoip") { line_type = "voip"; status = "valid_sms_capable_voip"; }
          else if (t === "landline") { line_type = "landline"; status = "landline"; }
          else {
            line_type = "unknown";
            status = "unverified";
            lookupError = `Twilio Lookup returned no SMS-capable line type: ${t ?? "missing"}`;
          }
        } catch { lookupError = "Réponse Twilio Lookup illisible"; }
      } else {
        lookupError = `Twilio Lookup ${resp.status}: ${body.slice(0, 300)}`;
        console.error(lookupError);
      }
    } else {
      lookupError = "Twilio Lookup credentials missing: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN";
    }

    const sms_eligible = status === "valid_mobile" || status === "valid_sms_capable_voip";
    const { error: updateErr } = await supabase.from("verified_contractor_prospects").update({
      phone_e164: e164,
      phone_line_type: line_type,
      phone_validation_status: status,
      sms_eligible,
      last_enriched_at: new Date().toISOString(),
      outreach_failure_reason: sms_eligible ? null : lookupError ?? `phone_not_sms_eligible: ${status}`,
    }).eq("id", prospect_id);
    if (updateErr) throw new FunctionError(updateErr.message, 500, "prospect_update_failed");

    return jsonResponse({ ok: true, e164, status, line_type, sms_eligible, lookup_error: lookupError, lookup_details: lookupDetails }, 200, requestId);
  } catch (e) {
    const err = e instanceof FunctionError ? e : new FunctionError((e as Error).message);
    console.error(`[${requestId}] ${FUNCTION_NAME} failed`, { code: err.code, status: err.status, message: err.message });
    return jsonResponse({ ok: false, code: err.code, message: err.message, error: err.message }, err.status, requestId);
  }
});
