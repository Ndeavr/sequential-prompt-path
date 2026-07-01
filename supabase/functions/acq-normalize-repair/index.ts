import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { normalizeAcquisitionLead } from "../_shared/normalization.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Body = { dry_run?: boolean; limit?: number; sample_size?: number };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body: Body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run !== false; // default true
  const limit = Math.min(Math.max(body.limit ?? 5000, 1), 20000);
  const sampleSize = Math.min(body.sample_size ?? 20, 50);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const counters = {
    scanned: 0,
    emails_normalized: 0,
    phones_normalized: 0,
    websites_normalized: 0,
    companies_normalized: 0,
    invalid_rejected: 0,
    ok: 0,
    partial: 0,
    unchanged: 0,
    updated: 0,
    errors: 0,
  };
  const samples: unknown[] = [];

  const PAGE = 500;
  let offset = 0;
  while (counters.scanned < limit) {
    const { data, error } = await sb
      .from("contractor_leads")
      .select(
        "id, email, phone, mobile_phone, website_url, company_name, email_normalized, phone_e164, website_normalized, company_name_normalized, normalization_status",
      )
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message, counters }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!data || data.length === 0) break;

    for (const row of data) {
      counters.scanned++;
      const norm = normalizeAcquisitionLead(row as any);

      const before = {
        email: row.email,
        phone: row.mobile_phone ?? row.phone,
        website: row.website_url,
        company: row.company_name,
      };
      const after = {
        email: norm.email_normalized,
        phone: norm.phone_e164,
        website: norm.website_normalized,
        company: norm.company_name_normalized,
        status: norm.normalization_status,
      };

      if (norm.email_normalized && norm.email_normalized !== row.email_normalized) counters.emails_normalized++;
      if (norm.phone_e164 && norm.phone_e164 !== row.phone_e164) counters.phones_normalized++;
      if (norm.website_normalized && norm.website_normalized !== row.website_normalized) counters.websites_normalized++;
      if (norm.company_name_normalized && norm.company_name_normalized !== row.company_name_normalized) counters.companies_normalized++;
      if (norm.normalization_status === "rejected") counters.invalid_rejected++;
      if (norm.normalization_status === "ok") counters.ok++;
      if (norm.normalization_status === "partial") counters.partial++;

      const changed =
        norm.email_normalized !== row.email_normalized ||
        norm.phone_e164 !== row.phone_e164 ||
        norm.website_normalized !== row.website_normalized ||
        norm.company_name_normalized !== row.company_name_normalized ||
        norm.normalization_status !== row.normalization_status;

      if (!changed) counters.unchanged++;

      if (samples.length < sampleSize && changed) {
        samples.push({ id: row.id, before, after, errors: norm.normalization_errors });
      }

      if (!dryRun && changed) {
        const { error: upErr } = await sb
          .from("contractor_leads")
          .update({
            email_normalized: norm.email_normalized,
            website_normalized: norm.website_normalized,
            company_name_normalized: norm.company_name_normalized,
            phone_original: norm.phone_original,
            phone_normalized: norm.phone_normalized,
            phone_e164: norm.phone_e164,
            phone_validation_status: norm.phone_validation_status,
            normalization_status: norm.normalization_status,
            normalization_errors: norm.normalization_errors,
            normalized_at: norm.normalized_at,
          })
          .eq("id", row.id);
        if (upErr) counters.errors++;
        else counters.updated++;
      }
    }

    offset += data.length;
    if (data.length < PAGE) break;
  }

  return new Response(
    JSON.stringify({ ok: true, dry_run: dryRun, counters, sample_before_after: samples }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
