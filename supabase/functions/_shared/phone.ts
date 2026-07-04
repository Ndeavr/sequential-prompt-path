// Phone intelligence — classify contractor prospect phone numbers as mobile,
// landline, VoIP, or unknown. Never send SMS to a non-mobile number.
//
// Strategy:
//  1. Normalize to E.164 (Canadian default).
//  2. Rule-based classification (Canadian mobile NPA/NXX is unreliable —
//     Canada mixes mobile/landline in the same area code — so rules only
//     mark obvious invalid or toll-free cases).
//  3. Delegate uncertain cases to Twilio Lookup v2 when TWILIO_LOOKUP_ENABLED=1.

export type PhoneType = "mobile" | "landline" | "voip_business" | "toll_free" | "unknown" | "invalid";

export interface PhoneClassification {
  e164: string | null;
  phone_type: PhoneType;
  has_mobile: boolean;
  has_landline: boolean;
  source: "invalid" | "rule" | "twilio_lookup" | "cache";
}

const TOLL_FREE_NPAS = new Set(["800", "833", "844", "855", "866", "877", "888"]);

export function normalizeToE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  if (raw.trim().startsWith("+") && digits.length >= 8) return "+" + digits;
  return null;
}

function ruleClassify(e164: string | null): PhoneClassification {
  if (!e164) return { e164: null, phone_type: "invalid", has_mobile: false, has_landline: false, source: "invalid" };
  const digits = e164.replace(/\D+/g, "");
  if (!digits.startsWith("1") || digits.length !== 11) {
    return { e164, phone_type: "unknown", has_mobile: false, has_landline: false, source: "rule" };
  }
  const npa = digits.slice(1, 4);
  if (TOLL_FREE_NPAS.has(npa)) {
    return { e164, phone_type: "toll_free", has_mobile: false, has_landline: false, source: "rule" };
  }
  return { e164, phone_type: "unknown", has_mobile: false, has_landline: false, source: "rule" };
}

async function twilioLookup(e164: string): Promise<PhoneClassification | null> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!sid || !token) return null;
  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence`;
  const auth = btoa(`${sid}:${token}`);
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) { await res.text(); return null; }
  const j = await res.json();
  const lt = j?.line_type_intelligence?.type as string | undefined;
  const map: Record<string, PhoneType> = {
    mobile: "mobile",
    landline: "landline",
    fixedVoip: "voip_business",
    nonFixedVoip: "voip_business",
    tollFree: "toll_free",
    personal: "mobile",
    voicemail: "voip_business",
    unknown: "unknown",
  };
  const t = map[lt ?? "unknown"] ?? "unknown";
  return {
    e164,
    phone_type: t,
    has_mobile: t === "mobile",
    has_landline: t === "landline",
    source: "twilio_lookup",
  };
}

export async function classifyPhone(raw: string | null | undefined): Promise<PhoneClassification> {
  const e164 = normalizeToE164(raw);
  if (!e164) return { e164: null, phone_type: "invalid", has_mobile: false, has_landline: false, source: "invalid" };
  const enable = Deno.env.get("TWILIO_LOOKUP_ENABLED") === "1";
  if (enable) {
    try {
      const t = await twilioLookup(e164);
      if (t) return t;
    } catch (_) { /* fall through to rules */ }
  }
  return ruleClassify(e164);
}

export function selectOutreachChannel(opts: {
  has_mobile: boolean;
  hasValidNonAggregatorEmail: boolean;
}): "sms_email" | "sms" | "email" | "none" {
  const { has_mobile, hasValidNonAggregatorEmail } = opts;
  if (has_mobile && hasValidNonAggregatorEmail) return "sms_email";
  if (has_mobile) return "sms";
  if (hasValidNonAggregatorEmail) return "email";
  return "none";
}
