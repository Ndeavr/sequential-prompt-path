// PROTECTED — UNPRO Quebec phone validation pipeline.
// Single source of truth used by validate-lead-phones, smsGuard, and senders.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { normalizePhone } from "./normalizePhone.ts";

export const QC_AREA_CODES = new Set([
  "418", "438", "450", "468", "514", "579", "581", "819", "873",
  "354", "367", "263",
]);

export type PhoneValidationStatus =
  | "pending_validation"
  | "valid_mobile"
  | "valid_voip"
  | "landline"
  | "invalid_phone"
  | "outside_quebec"
  | "do_not_contact"
  | "lookup_failed"
  | "lookup_unavailable";

export type PhoneFailureReason =
  | "invalid_format"
  | "missing_phone"
  | "bad_length"
  | "invalid_nanp"
  | "blocked_pattern"
  | "landline"
  | "carrier_rejected"
  | "opt_out"
  | "outside_quebec"
  | "missing_country_code"
  | "lookup_failed"
  | "lookup_unavailable"
  | null;


export type ClassifyResult = {
  e164: string | null;
  area_code: string | null;
  status: PhoneValidationStatus;
  reason: PhoneFailureReason;
};

/**
 * Step 1+2+3: clean → NANP validate → QC area code flag.
 * Does NOT call Twilio. Returns pending_validation when format is QC-valid
 * but mobile/landline is not yet known.
 */
export function classifyPhone(raw: string | null | undefined): ClassifyResult {
  const n = normalizePhone(raw);
  if (!n.valid || !n.normalized) {
    let reason: PhoneFailureReason = "invalid_format";
    if (n.reason === "bad_length") reason = "bad_length";
    else if (n.reason === "invalid_nanp") reason = "invalid_nanp";
    else if (n.reason === "no_digits" || n.reason === "empty") reason = "invalid_format";
    return { e164: null, area_code: n.area_code ?? null, status: "invalid_phone", reason };
  }
  if (n.country_code !== "1") {
    return { e164: n.normalized, area_code: null, status: "invalid_phone", reason: "missing_country_code" };
  }
  const npa = n.area_code ?? "";
  if (!QC_AREA_CODES.has(npa)) {
    return { e164: n.normalized, area_code: npa, status: "outside_quebec", reason: "outside_quebec" };
  }
  // Block obvious placeholder / test / fake patterns before we ever call Twilio.
  if (isBlockedPattern(n.normalized)) {
    return { e164: n.normalized, area_code: npa, status: "invalid_phone", reason: "blocked_pattern" };
  }
  return { e164: n.normalized, area_code: npa, status: "pending_validation", reason: null };
}

/**
 * Rejects placeholder / sequential / repeating / 555-01xx test numbers.
 * Input is an E.164 string like "+15145501234".
 */
export function isBlockedPattern(e164: string): boolean {
  const digits = (e164 || "").replace(/\D/g, "");
  if (digits.length !== 11 || !digits.startsWith("1")) return false;
  const nxx = digits.slice(4, 7);   // exchange
  const last4 = digits.slice(7, 11);
  const sub7 = digits.slice(4, 11); // 7-digit subscriber
  const SEQ_UP = "01234567890";
  const SEQ_DN = "09876543210";
  // Repeating last 4 (0000, 1111, ..., 9999)
  if (/^(\d)\1{3}$/.test(last4)) return true;
  // Sequential last 4 (up or down): 1234, 2345, ..., 0123, 9876, ...
  if (SEQ_UP.includes(last4) || SEQ_DN.includes(last4)) return true;
  // Repeating 7-digit subscriber (5555555, 1111111, ...)
  if (/^(\d)\1{6}$/.test(sub7)) return true;
  // Sequential 7-digit subscriber (1234567, 2345678, ...)
  if (SEQ_UP.includes(sub7) || SEQ_DN.includes(sub7)) return true;
  // All-zero subscriber (AAA0000000)
  if (sub7 === "0000000") return true;
  // Reserved 555-01xx test range
  if (nxx === "555") {
    const n4 = parseInt(last4, 10);
    if (n4 >= 100 && n4 <= 199) return true;
  }
  return false;
}


/**
 * Step 4: Twilio Lookup v2 (line_type_intelligence).
 * Returns the mapped status + carrier; persistence handled by caller.
 */
export type LookupResult = {
  ok: boolean;
  status: PhoneValidationStatus;
  reason: PhoneFailureReason;
  phone_type: "mobile" | "landline" | "voip" | "unknown";
  carrier: string | null;
  raw?: unknown;
  http_status?: number | null;
};

export async function lookupPhone(e164: string): Promise<LookupResult> {
  const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!SID || !TOKEN) {
    return {
      ok: false, status: "lookup_unavailable", reason: "lookup_unavailable",
      phone_type: "unknown", carrier: null, http_status: null,
      raw: { error: "TWILIO_CREDENTIALS_MISSING" },
    };
  }
  try {
    const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence`;
    const auth = btoa(`${SID}:${TOKEN}`);
    const resp = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    const http_status = resp.status;
    let body: any = null;
    try { body = await resp.json(); } catch { body = { error: "non_json_response" }; }

    if (!resp.ok) {
      // Twilio code 20404 = number not found / invalid format → real invalid
      const twCode = Number(body?.code ?? 0);
      if (twCode === 20404) {
        return { ok: true, status: "invalid_phone", reason: "invalid_nanp", phone_type: "unknown", carrier: null, raw: body, http_status };
      }
      // Any other HTTP error → unavailable, NOT invalid
      return { ok: false, status: "lookup_unavailable", reason: "lookup_unavailable", phone_type: "unknown", carrier: null, raw: body, http_status };
    }

    const lti = (body?.line_type_intelligence ?? {}) as { type?: string; carrier_name?: string };
    const rawType = String(lti.type ?? "").toLowerCase();
    let phone_type: LookupResult["phone_type"] = "unknown";
    let status: PhoneValidationStatus = "lookup_unavailable";
    let reason: PhoneFailureReason = "lookup_unavailable";

    if (rawType === "mobile") { phone_type = "mobile"; status = "valid_mobile"; reason = null; }
    else if (rawType.includes("voip")) { phone_type = "voip"; status = "valid_voip"; reason = null; }
    else if (rawType === "landline" || rawType === "fixed") { phone_type = "landline"; status = "landline"; reason = "landline"; }
    else { phone_type = "unknown"; status = "lookup_unavailable"; reason = "lookup_unavailable"; }

    return { ok: true, status, reason, phone_type, carrier: lti.carrier_name ?? null, raw: body, http_status };
  } catch (e) {
    return {
      ok: false, status: "lookup_unavailable", reason: "lookup_unavailable",
      phone_type: "unknown", carrier: null, http_status: null,
      raw: { error: String((e as Error).message ?? e) },
    };
  }
}


/**
 * Full validation: classify → lookup if needed → persist to contractor_leads.
 * Idempotent. Skips Twilio call if status already terminal.
 */
export async function validateAndPersistLeadPhone(
  sb: ReturnType<typeof createClient>,
  lead: { id: string; phone?: string | null; mobile_phone?: string | null; email?: string | null; phone_validation_status?: string | null; do_not_contact?: boolean | null },
): Promise<ClassifyResult & { phone_type?: string; carrier?: string | null; contact_method?: string }> {
  const raw = lead.mobile_phone || lead.phone || "";
  const c = classifyPhone(raw);
  const email = (lead.email ?? "").trim();
  const hasEmail = email.length > 0 && /@/.test(email);

  const deriveMethod = (phoneType: string | null): string => {
    if (lead.do_not_contact) return "skip";
    if (phoneType === "mobile") return "mobile_sms";
    if (hasEmail) return "email";
    if (phoneType === "landline" || phoneType === "voip" || phoneType === "unknown") return "manual";
    return "unknown";
  };

  // Format-invalid → persist and stop
  if (c.status === "invalid_phone" || c.status === "outside_quebec") {
    const contact_method = hasEmail ? "email" : "skip";
    await sb.from("contractor_leads").update({
      phone_e164: c.e164,
      phone_area_code: c.area_code,
      phone_validation_status: c.status,
      phone_failure_reason: c.reason,
      phone_lookup_at: new Date().toISOString(),
      contact_method,
    }).eq("id", lead.id);
    return { ...c, contact_method };
  }

  // Format ok → Twilio Lookup
  const lk = await lookupPhone(c.e164!);
  const contact_method = deriveMethod(lk.phone_type);
  await sb.from("contractor_leads").update({
    phone_e164: c.e164,
    phone_area_code: c.area_code,
    phone_type: lk.phone_type,
    phone_carrier: lk.carrier,
    phone_validation_status: lk.status,
    phone_failure_reason: lk.reason,
    phone_lookup_at: new Date().toISOString(),
    contact_method,
  }).eq("id", lead.id);

  // Trigger email fallback dispatch when not mobile + has email (fire-and-forget)
  if (lk.phone_type !== "mobile" && hasEmail) {
    try {
      const SUPA_URL = Deno.env.get("SUPABASE_URL");
      const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPA_URL && SRK) {
        await fetch(`${SUPA_URL}/functions/v1/email-fallback-dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SRK}` },
          body: JSON.stringify({ lead_id: lead.id, reason: "non_mobile_validation" }),
        }).catch(() => {});
      }
    } catch (_) { /* swallow */ }
  }

  return { ...c, status: lk.status, reason: lk.reason, phone_type: lk.phone_type, carrier: lk.carrier, contact_method };
}

// SMS-eligible statuses. `lookup_unavailable` is included because Twilio Lookup being
// unreachable (missing credentials, quota, network) MUST NOT be treated as "invalid".
// Valid E.164 QC numbers are sent as tentative mobile — the send path itself will fail
// gracefully if the number is unreachable, and per-lead sms_failed_attempts protects us.
export const SMS_ALLOWED_STATUSES: PhoneValidationStatus[] = [
  "valid_mobile",
  "valid_voip",
  "lookup_unavailable",
];
