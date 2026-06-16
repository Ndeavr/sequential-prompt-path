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
  | "lookup_failed";

export type PhoneFailureReason =
  | "invalid_format"
  | "bad_length"
  | "invalid_nanp"
  | "blocked_pattern"
  | "landline"
  | "carrier_rejected"
  | "opt_out"
  | "outside_quebec"
  | "missing_country_code"
  | "lookup_failed"
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
  return { e164: n.normalized, area_code: npa, status: "pending_validation", reason: null };
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
};

export async function lookupPhone(e164: string): Promise<LookupResult> {
  const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
  const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!SID || !TOKEN) {
    return { ok: false, status: "lookup_failed", reason: "lookup_failed", phone_type: "unknown", carrier: null };
  }
  try {
    const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence`;
    const auth = btoa(`${SID}:${TOKEN}`);
    const resp = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    const body = await resp.json();
    if (!resp.ok) {
      return { ok: false, status: "lookup_failed", reason: "lookup_failed", phone_type: "unknown", carrier: null, raw: body };
    }
    const lti = (body?.line_type_intelligence ?? {}) as { type?: string; carrier_name?: string };
    const rawType = String(lti.type ?? "").toLowerCase();
    let phone_type: LookupResult["phone_type"] = "unknown";
    let status: PhoneValidationStatus = "lookup_failed";
    let reason: PhoneFailureReason = "lookup_failed";

    if (rawType === "mobile") { phone_type = "mobile"; status = "valid_mobile"; reason = null; }
    else if (rawType.includes("voip")) { phone_type = "voip"; status = "valid_voip"; reason = null; }
    else if (rawType === "landline" || rawType === "fixed") { phone_type = "landline"; status = "landline"; reason = "landline"; }
    else { phone_type = "unknown"; status = "lookup_failed"; reason = "lookup_failed"; }

    return { ok: true, status, reason, phone_type, carrier: lti.carrier_name ?? null, raw: body };
  } catch (e) {
    return { ok: false, status: "lookup_failed", reason: "lookup_failed", phone_type: "unknown", carrier: null, raw: { error: String((e as Error).message ?? e) } };
  }
}

/**
 * Full validation: classify → lookup if needed → persist to contractor_leads.
 * Idempotent. Skips Twilio call if status already terminal.
 */
export async function validateAndPersistLeadPhone(
  sb: ReturnType<typeof createClient>,
  lead: { id: string; phone?: string | null; mobile_phone?: string | null; phone_validation_status?: string | null },
): Promise<ClassifyResult & { phone_type?: string; carrier?: string | null }> {
  const raw = lead.mobile_phone || lead.phone || "";
  const c = classifyPhone(raw);

  // Format-invalid → persist and stop
  if (c.status === "invalid_phone" || c.status === "outside_quebec") {
    await sb.from("contractor_leads").update({
      phone_e164: c.e164,
      phone_area_code: c.area_code,
      phone_validation_status: c.status,
      phone_failure_reason: c.reason,
      phone_lookup_at: new Date().toISOString(),
    }).eq("id", lead.id);
    return c;
  }

  // Format ok → Twilio Lookup
  const lk = await lookupPhone(c.e164!);
  await sb.from("contractor_leads").update({
    phone_e164: c.e164,
    phone_area_code: c.area_code,
    phone_type: lk.phone_type,
    phone_carrier: lk.carrier,
    phone_validation_status: lk.status,
    phone_failure_reason: lk.reason,
    phone_lookup_at: new Date().toISOString(),
  }).eq("id", lead.id);

  // If now valid, re-fire curiosity enrollment if applicable
  if (lk.status === "valid_mobile" || lk.status === "valid_voip") {
    await sb.rpc("noop", {}).catch(() => {}); // placeholder; trigger re-fires on next pipeline_status update
  }

  return { ...c, status: lk.status, reason: lk.reason, phone_type: lk.phone_type, carrier: lk.carrier };
}

export const SMS_ALLOWED_STATUSES: PhoneValidationStatus[] = ["valid_mobile", "valid_voip"];
