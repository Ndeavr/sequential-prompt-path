// UNPRO — Validate Kijiji contacts: classify phone type and pick outreach route.
// Uses Twilio Lookup when available; otherwise defaults to "unknown".

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

  let query = sb.from("contractor_prospects")
    .select("id, phone, email, phone_type, phone_sms_capable")
    .eq("source_key", "kijiji_services")
    .is("phone_type", null)
    .not("phone", "is", null)
    .limit(limit);
  if (prospectId) query = query.eq("id", prospectId);

  const { data: prospects, error } = await query;
  if (error) return json({ success: false, error: error.message }, 500);

  const results: any[] = [];

  for (const p of prospects ?? []) {
    const norm = normalizePhone(p.phone ?? "");
    if (!norm.valid || !norm.normalized) {
      await sb.from("contractor_prospects").update({
        phone_type: "invalid",
        phone_sms_capable: false,
        outreach_eligibility: p.email ? "email_only" : "invalid_phone",
      }).eq("id", p.id);
      results.push({ id: p.id, valid: false });
      continue;
    }

    // Cache lookup (90-day window)
    const { data: cache } = await sb.from("phone_carrier_cache")
      .select("line_type, validated_at, raw_payload")
      .eq("normalized_phone", norm.normalized)
      .maybeSingle();

    let line_type = "unknown";
    let cache_hit = false;
    if (cache?.validated_at && (Date.now() - new Date(cache.validated_at).getTime()) < 90 * 86400 * 1000) {
      line_type = cache.line_type ?? "unknown";
      cache_hit = true;
    } else if (TW_SID && TW_TOKEN) {
      try {
        const auth = btoa(`${TW_SID}:${TW_TOKEN}`);
        const r = await fetch(`https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(norm.normalized)}?Fields=line_type_intelligence`, {
          headers: { Authorization: `Basic ${auth}` },
        });
        if (r.ok) {
          const j = await r.json();
          const t = j?.line_type_intelligence?.type ?? "unknown";
          line_type = t === "mobile" ? "mobile"
            : t === "landline" ? "landline"
            : (t === "voip" || t === "nonFixedVoip") ? "voip"
            : "unknown";
          await sb.from("phone_carrier_cache").upsert({
            normalized_phone: norm.normalized,
            line_type,
            carrier: j?.line_type_intelligence?.carrier_name ?? null,
            country_code: "1",
            raw_payload: j,
            validated_at: new Date().toISOString(),
          }, { onConflict: "normalized_phone" });
        }
      } catch (e) {
        console.error("twilio lookup failed", e);
      }
    }

    const sms_capable = line_type === "mobile" || line_type === "voip";
    let eligibility: string;
    if (line_type === "mobile") eligibility = "sms_ready";
    else if (line_type === "voip" && sms_capable) eligibility = "sms_test";
    else if (line_type === "landline" && p.email) eligibility = "email_only";
    else if (line_type === "landline") eligibility = "manual_call_queue";
    else if (p.email) eligibility = "email_only";
    else eligibility = "validation_queue";

    await sb.from("contractor_prospects").update({
      phone: norm.normalized,
      phone_type: line_type,
      phone_sms_capable: sms_capable,
      outreach_eligibility: eligibility,
    }).eq("id", p.id);

    results.push({ id: p.id, line_type, sms_capable, eligibility, cache_hit });
  }

  return json({ success: true, validated: results.length, results });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
