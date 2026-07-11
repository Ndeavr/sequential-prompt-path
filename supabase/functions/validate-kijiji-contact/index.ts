// UNPRO — Validate Kijiji contacts: classify phone type and pick outreach route.
// Uses Twilio Lookup when TWILIO_ACCOUNT_SID/AUTH_TOKEN available; otherwise
// falls back to NANP heuristics and marks phone_type "unknown".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { normalizePhone } from "../_shared/normalizePhone.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TW_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TW_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const body = await req.json().catch(() => ({}));
  const limit: number = Math.min(body.limit ?? 50, 200);
  const prospectId: string | undefined = body.prospect_id;

  const query = sb.from("contractor_prospects")
    .select("id, phone, email, phone_type, phone_sms_capable, outreach_eligibility")
    .eq("source_key", "kijiji_services")
    .is("phone_type", null)
    .not("phone", "is", null)
    .limit(limit);

  if (prospectId) query.eq("id", prospectId);

  const { data: prospects, error } = await query;
  if (error) return json({ success: false, error: error.message }, 500);

  const results: any[] = [];

  for (const p of prospects ?? []) {
    const norm = normalizePhone(p.phone ?? "");
    if (!norm.valid || !norm.normalized) {
      await sb.from("contractor_prospects").update({
        phone_type: "unknown",
        phone_sms_capable: false,
        outreach_eligibility: p.email ? "email_only" : "invalid_phone",
      }).eq("id", p.id);
      results.push({ id: p.id, valid: false });
      continue;
    }

    // Cached lookup within 90 days
    const { data: cache } = await sb.from("phone_carrier_cache")
      .select("phone_type, sms_capable, updated_at")
      .eq("phone_e164", norm.normalized)
      .maybeSingle();

    let phone_type = "unknown";
    let sms_capable = false;

    if (cache && cache.updated_at && (Date.now() - new Date(cache.updated_at).getTime()) < 90 * 86400 * 1000) {
      phone_type = cache.phone_type;
      sms_capable = cache.sms_capable;
    } else if (TW_SID && TW_TOKEN) {
      try {
        const auth = btoa(`${TW_SID}:${TW_TOKEN}`);
        const r = await fetch(`https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(norm.normalized)}?Fields=line_type_intelligence`, {
          headers: { Authorization: `Basic ${auth}` },
        });
        if (r.ok) {
          const j = await r.json();
          const line = j?.line_type_intelligence?.type ?? "unknown";
          phone_type = line === "mobile" ? "mobile"
            : line === "landline" ? "landline"
            : line === "voip" || line === "nonFixedVoip" ? "voip" : "unknown";
          sms_capable = phone_type === "mobile" || phone_type === "voip";
          await sb.from("phone_carrier_cache").upsert({
            phone_e164: norm.normalized,
            phone_type,
            sms_capable,
            carrier_name: j?.line_type_intelligence?.carrier_name ?? null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "phone_e164" });
        }
      } catch (e) {
        console.error("twilio lookup failed", e);
      }
    }

    // Route
    let eligibility: string;
    if (phone_type === "mobile") eligibility = "sms_ready";
    else if (phone_type === "voip" && sms_capable) eligibility = "sms_test";
    else if (phone_type === "landline" && p.email) eligibility = "email_only";
    else if (phone_type === "landline") eligibility = "manual_call_queue";
    else if (p.email) eligibility = "email_only";
    else eligibility = "validation_queue";

    await sb.from("contractor_prospects").update({
      phone_type,
      phone_sms_capable: sms_capable,
      outreach_eligibility: eligibility,
    }).eq("id", p.id);

    results.push({ id: p.id, phone_type, sms_capable, eligibility });
  }

  return json({ success: true, validated: results.length, results });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
