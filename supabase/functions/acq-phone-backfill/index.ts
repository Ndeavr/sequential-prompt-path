// Backfills phone_type for contractor_leads.
// 1) Quarantines all numbers that hit Twilio 30006 (landline_or_unreachable) → sms_disabled=true.
// 2) For leads still missing phone_type, runs Twilio Lookup (rate-limited).
// Idempotent. Safe to re-run.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { lookupPhoneTypeCached } from "../_shared/smsGuard.ts";
import { normalizePhone } from "../_shared/normalizePhone.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const max_lookups = Math.min(Number(body?.max_lookups ?? 100), 500);
  const dry_run = body?.dry_run === true;

  const result = {
    quarantined_30006: 0,
    quarantined_21211: 0,
    looked_up: 0,
    mobile: 0,
    landline: 0,
    voip: 0,
    unknown: 0,
    skipped: 0,
    errors: [] as string[],
  };


  // ── Phase 1: quarantine 30006 (landline_or_unreachable) ──
  try {
    const { data: failedLogs } = await supabase
      .from("contractor_outreach_logs")
      .select("lead_id, to_address, error_code, error_message, provider_response")
      .eq("channel", "sms")
      .or("error_code.eq.30006,error_message.ilike.%30006%")
      .not("lead_id", "is", null);

    const leadIds = new Set<string>();
    for (const row of failedLogs ?? []) {
      if ((row as any).lead_id) leadIds.add((row as any).lead_id);
    }
    if (leadIds.size > 0 && !dry_run) {
      const { error } = await supabase
        .from("contractor_leads")
        .update({
          phone_type: "landline_or_unreachable",
          sms_disabled: true,
          sms_suppressed_at: new Date().toISOString(),
          sms_suppressed_reason: "twilio_30006",
          contact_method: "email",
          phone_validation_status: "verified_not_mobile",
          phone_validation_checked_at: new Date().toISOString(),
        })
        .in("id", Array.from(leadIds));
      if (error) result.errors.push(`quarantine: ${error.message}`);
    }
    result.quarantined_30006 = leadIds.size;
  } catch (e) {
    result.errors.push(`phase1: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── Phase 2: lookup unknown numbers ──
  try {
    const { data: leads } = await supabase
      .from("contractor_leads")
      .select("id, phone")
      .or("phone_type.is.null,phone_type.eq.unknown")
      .not("phone", "is", null)
      .neq("sms_disabled", true)
      .limit(max_lookups);

    for (const lead of leads ?? []) {
      const norm = normalizePhone((lead as any).phone);
      if (!norm.valid || !norm.normalized) {
        result.skipped++;
        if (!dry_run) {
          await supabase.from("contractor_leads").update({
            phone_validation_status: "invalid_format",
            phone_validation_checked_at: new Date().toISOString(),
          }).eq("id", (lead as any).id);
        }
        continue;
      }
      if (dry_run) {
        result.looked_up++;
        continue;
      }
      const t = await lookupPhoneTypeCached(supabase, norm.normalized);
      result.looked_up++;
      if (!t) { result.skipped++; continue; }
      if (t === "mobile") result.mobile++;
      else if (t === "landline") result.landline++;
      else if (t === "voip") result.voip++;
      else result.unknown++;

      const isNotMobile = t !== "mobile";
      await supabase.from("contractor_leads").update({
        phone_type: t,
        phone_e164: norm.normalized,
        phone_validation_status: t === "mobile" ? "verified_mobile" : "verified_not_mobile",
        phone_validation_checked_at: new Date().toISOString(),
        phone_lookup_at: new Date().toISOString(),
        ...(isNotMobile ? {
          sms_disabled: true,
          sms_suppressed_at: new Date().toISOString(),
          sms_suppressed_reason: `twilio_lookup_${t}`,
          contact_method: "email",
        } : {}),
      }).eq("id", (lead as any).id);

      // Light rate limit ~20/sec (Twilio Lookup quota safe)
      await new Promise((r) => setTimeout(r, 50));
    }
  } catch (e) {
    result.errors.push(`phase2: ${e instanceof Error ? e.message : String(e)}`);
  }

  return json({ ok: result.errors.length === 0, dry_run, ...result });
});
