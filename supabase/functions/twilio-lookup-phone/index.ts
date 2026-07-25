// Twilio Lookup v2 — detect mobile/landline/voip + cache 90d on contacts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function normalizeE164(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+\d{10,15}$/.test(digits)) return digits;
  const only = digits.replace(/\D/g, "");
  if (only.length === 10) return `+1${only}`;          // QC/CA default
  if (only.length === 11 && only.startsWith("1")) return `+${only}`;
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SID || !TOKEN) return json({ error: "Twilio credentials missing" }, 500);

    const { phone, contact_id, force = false } = await req.json();
    const e164 = normalizeE164(phone);
    if (!e164) return json({ error: "Phone invalide", phone_type: "unknown" }, 400);

    const supa = createClient(SUPA_URL, SRK, { auth: { autoRefreshToken: false, persistSession: false } });

    // cache check
    if (!force && contact_id) {
      const { data: c } = await supa.from("contacts")
        .select("phone_type,phone_verified,lookup_cached_at,phone_e164")
        .eq("id", contact_id).maybeSingle();
      if (c?.lookup_cached_at && c.phone_e164 === e164) {
        const ageDays = (Date.now() - new Date(c.lookup_cached_at).getTime()) / 86400000;
        if (ageDays < 90) {
          return json({ cached: true, phone_e164: e164, phone_type: c.phone_type, phone_verified: c.phone_verified });
        }
      }
    }

    // Twilio Lookup v2 with line_type_intelligence
    const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence`;
    const auth = btoa(`${SID}:${TOKEN}`);
    const resp = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    const body = await resp.json();

    if (!resp.ok) {
      return json({ error: "Twilio lookup failed", details: body, phone_e164: e164, phone_type: "unknown" }, resp.status);
    }

    const lti = body?.line_type_intelligence || {};
    const rawType = String(lti.type || "").toLowerCase(); // mobile, landline, fixedVoip, nonFixedVoip, ...
    let phone_type: "mobile" | "landline" | "voip" | "unknown" = "unknown";
    if (rawType === "mobile") phone_type = "mobile";
    else if (rawType === "landline") phone_type = "landline";
    else if (rawType.includes("voip")) phone_type = "voip";

    // LTI availability: some countries (notably CA) return error 60601 or an empty
    // type even for perfectly valid numbers. In that case we STILL consider the
    // number verified for downstream use — the SMS pipeline will attempt SMS and
    // fall back to email if delivery fails.
    const lti_available = !!lti.type;
    const number_valid = body?.valid === true;
    const phone_verified = number_valid || lti_available;

    if (contact_id) {
      await supa.from("contacts").update({
        phone_e164: e164,
        phone_type,
        phone_verified,
        lookup_cached_at: new Date().toISOString(),
      }).eq("id", contact_id);
    }

    return json({
      cached: false,
      phone_e164: e164,
      phone_type,
      phone_verified,
      number_valid,
      lti_available,
      carrier: lti.carrier_name ?? null,
      debug: { lti_type: lti.type ?? null, lti_error_code: lti.error_code ?? null, valid: body?.valid ?? null },
    });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e), phone_type: "unknown" }, 500);
  }
});
