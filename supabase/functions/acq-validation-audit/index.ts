// UNPRO — Validation audit (read-only).
// Returns first 50 failing leads + full distribution + scraper quality sample.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // 1) Distribution buckets
    const { data: all } = await sb
      .from("contractor_leads")
      .select(
        "id,company_name,phone,mobile_phone,email,phone_e164,phone_area_code," +
        "phone_type,phone_validation_status,phone_failure_reason,validation_status," +
        "phone_lookup_raw,phone_lookup_http_status,tentative_send",
      );
    const rows = all ?? [];

    const distribution = {
      total: rows.length,
      missing_phone: 0,
      invalid_format: 0,
      invalid_nanp: 0,
      outside_quebec: 0,
      landline: 0,
      lookup_unavailable: 0,
      lookup_failed: 0,
      pending_validation: 0,
      duplicate: 0,
      valid: 0,
      valid_tentative: 0,
      with_email: 0,
    };
    const seenE164 = new Set<string>();
    const duplicates = new Set<string>();
    for (const r of rows) {
      const e164 = (r as any).phone_e164;
      if (e164) { if (seenE164.has(e164)) duplicates.add(e164); else seenE164.add(e164); }
      if ((r as any).email && /@/.test((r as any).email)) distribution.with_email++;
    }
    for (const r of rows) {
      const rr = r as any;
      const status = rr.phone_validation_status;
      const reason = rr.phone_failure_reason;
      const vstatus = rr.validation_status;
      if (vstatus === "duplicate") { distribution.duplicate++; continue; }
      if (vstatus === "valid") {
        if (rr.tentative_send) distribution.valid_tentative++;
        else distribution.valid++;
        continue;
      }
      if (reason === "missing_phone") distribution.missing_phone++;
      else if (reason === "invalid_nanp") distribution.invalid_nanp++;
      else if (reason === "landline" || status === "landline") distribution.landline++;
      else if (status === "outside_quebec") distribution.outside_quebec++;
      else if (status === "lookup_unavailable") distribution.lookup_unavailable++;
      else if (status === "lookup_failed") distribution.lookup_failed++;
      else if (status === "pending_validation") distribution.pending_validation++;
      else distribution.invalid_format++;
    }

    // 2) First 50 failing records (not valid + not duplicate)
    const failing = rows
      .filter((r: any) => r.validation_status !== "valid")
      .slice(0, 50)
      .map((r: any) => ({
        id: r.id,
        company_name: r.company_name,
        phone_original: r.mobile_phone || r.phone || null,
        phone_normalized: r.phone_e164,
        area_code: r.phone_area_code,
        validation_status: r.validation_status,
        phone_validation_status: r.phone_validation_status,
        validation_reason: r.phone_failure_reason,
        phone_type: r.phone_type,
        twilio_http_status: r.phone_lookup_http_status,
        twilio_lookup_body: r.phone_lookup_raw,
        has_email: !!(r.email && /@/.test(r.email)),
      }));

    // 3) Scraper quality sample (random 100)
    const sample = rows.slice().sort(() => Math.random() - 0.5).slice(0, 100);
    const quality = {
      sample_size: sample.length,
      missing_phone_pct: 0,
      mobile_pct: 0,
      landline_pct: 0,
      voip_pct: 0,
      invalid_pct: 0,
      duplicate_pct: 0,
      with_email_pct: 0,
    };
    if (sample.length > 0) {
      let m = 0, l = 0, v = 0, mob = 0, voip = 0, inv = 0, dup = 0, mail = 0;
      const seen = new Set<string>();
      for (const r of sample as any[]) {
        const phone = r.mobile_phone || r.phone || "";
        if (!phone) m++;
        if (r.phone_e164) {
          if (seen.has(r.phone_e164)) dup++;
          else seen.add(r.phone_e164);
        }
        if (r.phone_type === "mobile") mob++;
        else if (r.phone_type === "voip") voip++;
        else if (r.phone_type === "landline") l++;
        if (r.validation_status === "invalid_phone") inv++;
        if (r.email && /@/.test(r.email)) mail++;
      }
      const n = sample.length;
      quality.missing_phone_pct = Math.round((m / n) * 100);
      quality.mobile_pct = Math.round((mob / n) * 100);
      quality.landline_pct = Math.round((l / n) * 100);
      quality.voip_pct = Math.round((voip / n) * 100);
      quality.invalid_pct = Math.round((inv / n) * 100);
      quality.duplicate_pct = Math.round((dup / n) * 100);
      quality.with_email_pct = Math.round((mail / n) * 100);
    }

    // 4) Final report
    const validNow = distribution.valid + distribution.valid_tentative;
    const emailableOnly = rows.filter((r: any) =>
      r.validation_status !== "valid" &&
      r.email && /@/.test(r.email) &&
      (r.phone_failure_reason === "missing_phone" || r.phone_validation_status === "landline")
    ).length;
    const unusable = rows.filter((r: any) =>
      r.validation_status !== "valid" &&
      !(r.email && /@/.test(r.email)) &&
      (r.phone_failure_reason === "missing_phone" || r.phone_validation_status === "invalid_phone")
    ).length;

    return new Response(JSON.stringify({
      ok: true,
      distribution,
      duplicates_count: duplicates.size,
      failing_first_50: failing,
      scraper_quality: quality,
      final_report: {
        contactable_today_sms: validNow,
        email_fallback_only: emailableOnly,
        unusable,
        total: rows.length,
      },
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
