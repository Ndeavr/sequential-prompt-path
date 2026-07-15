import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FUNCTION_NAME = "import-contractors";

const BodySchema = z.object({
  rows: z.array(z.record(z.any())).min(1).max(500),
  auto_send: z.boolean().default(true),
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  const requestId = crypto.randomUUID();
  return new Response(JSON.stringify({ function: FUNCTION_NAME, request_id: requestId, ...body }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId },
  });
}

function get(row: Record<string, unknown>, keys: string[]) {
  const normalized = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]));
  for (const key of keys) {
    const v = normalized[key.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function normalizePhone(raw: string | null) {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return raw.startsWith("+") ? raw : null;
}

function normalizeWebsite(raw: string | null) {
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function qualityScore(input: { website: boolean; phone: boolean; email: boolean; city: boolean; category: boolean }) {
  return (input.website ? 20 : 0) + (input.phone ? 25 : 0) + (input.email ? 20 : 0) + (input.city ? 20 : 0) + (input.category ? 15 : 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return jsonResponse({ ok: false, message: "Backend credentials missing" }, 500);

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return jsonResponse({ ok: false, message: "Invalid import payload", errors: parsed.error.flatten().fieldErrors }, 400);

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { rows, auto_send } = parsed.data;
  const batchInsert = await supabase.from("acquisition_manual_import_batches").insert({
    status: "running",
    source: "manual",
    row_count: rows.length,
    started_at: new Date().toISOString(),
  }).select("id").single();
  if (batchInsert.error) return jsonResponse({ ok: false, message: batchInsert.error.message }, 500);

  const batchId = batchInsert.data.id;
  let imported = 0;
  let verified = 0;
  let queued = 0;
  let errors = 0;
  const results: Array<Record<string, unknown>> = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const company = get(raw, ["company", "entreprise", "business", "business_name", "name"]);
    const contact = get(raw, ["contact", "contact_name", "nom"]);
    const phone = get(raw, ["phone", "téléphone", "telephone", "tel"]);
    const email = get(raw, ["email", "courriel"]);
    const website = get(raw, ["website", "site", "site web", "website_url"]);
    const city = get(raw, ["city", "ville"]);
    const category = get(raw, ["category", "catégorie", "trade", "service"]);
    const phoneE164 = normalizePhone(phone);
    const websiteUrl = normalizeWebsite(website);
    const score = qualityScore({ website: !!websiteUrl, phone: !!phoneE164, email: !!email, city: !!city, category: !!category });

    const rowBase = { batch_id: batchId, row_number: i + 1, company, contact, phone, email, website, city, category };
    if (!company) {
      errors += 1;
      await supabase.from("acquisition_manual_import_rows").insert({ ...rowBase, status: "failed", error: "company_missing" });
      results.push({ row: i + 1, status: "failed", error: "company_missing" });
      continue;
    }

    const prospectPayload = {
      business_name: company,
      legal_name: company,
      category,
      website_url: websiteUrl,
      phone_primary: phoneE164 ?? phone,
      phone_e164: phoneE164,
      phone_line_type: "unknown",
      phone_validation_status: phoneE164 ? "unknown" : "missing",
      sms_eligible: !!phoneE164,
      email: email?.toLowerCase() ?? null,
      city,
      verification_status: score >= 70 && !!phoneE164 ? "verified" : "needs_enrichment",
      data_quality_score: score,
      source: "manual",
      source_urls: { manual_import_batch: batchId, contact },
      verified_at: score >= 70 && !!phoneE164 ? new Date().toISOString() : null,
      last_enriched_at: new Date().toISOString(),
      last_action_at: new Date().toISOString(),
      outreach_status: "none",
    };

    const existing = phoneE164
      ? await supabase.from("verified_contractor_prospects").select("id").eq("phone_e164", phoneE164).maybeSingle()
      : { data: null } as any;
    const write = existing.data?.id
      ? await supabase.from("verified_contractor_prospects").update(prospectPayload).eq("id", existing.data.id).select("id,business_name,city,category,source,verification_status").single()
      : await supabase.from("verified_contractor_prospects").insert(prospectPayload).select("id,business_name,city,category,source,verification_status").single();

    if (write.error || !write.data) {
      errors += 1;
      await supabase.from("acquisition_manual_import_rows").insert({ ...rowBase, status: "failed", error: write.error?.message ?? "prospect_write_failed" });
      results.push({ row: i + 1, status: "failed", error: write.error?.message });
      continue;
    }

    imported += 1;
    if (write.data.verification_status === "verified") verified += 1;
    await supabase.from("acquisition_pipeline_events").insert({
      prospect_id: write.data.id,
      business_name: write.data.business_name,
      city: write.data.city,
      category: write.data.category,
      source: "manual",
      stage: "scraped",
      metadata: { import_batch: batchId },
    });

    let rowStatus = write.data.verification_status === "verified" ? "verified" : "imported";
    if (write.data.verification_status === "verified") {
      await supabase.from("acquisition_queue").upsert({
        prospect_id: write.data.id,
        state: phoneE164 ? "ready_sms" : "ready_email",
        channel: phoneE164 ? "sms" : "email",
        next_action_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "prospect_id" });
      queued += 1;
      rowStatus = "queued_outreach";
      await supabase.from("acquisition_pipeline_events").insert({ prospect_id: write.data.id, business_name: write.data.business_name, city: write.data.city, category: write.data.category, source: "manual", stage: phoneE164 ? "ready_sms" : "ready_email", metadata: { import_batch: batchId } });
    }

    await supabase.from("acquisition_manual_import_rows").insert({ ...rowBase, prospect_id: write.data.id, status: rowStatus, normalized: prospectPayload });
    results.push({ row: i + 1, status: rowStatus, prospect_id: write.data.id });
  }

  let sendResult: any = null;
  if (auto_send && queued > 0) {
    const res = await fetch(`${url}/functions/v1/send-verified-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ dry_run: false, limit: Math.min(queued, 25) }),
    });
    sendResult = await res.json().catch(() => ({}));
  }

  const sent = Number(sendResult?.sent ?? 0);
  await supabase.from("acquisition_manual_import_batches").update({
    status: "completed",
    imported_count: imported,
    verified_count: verified,
    queued_count: queued,
    sent_count: sent,
    error_count: errors,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", batchId);

  await supabase.from("acquisition_source_health").upsert({
    source: "manual",
    status: imported > 0 ? "healthy" : "degraded",
    last_run_at: new Date().toISOString(),
    last_success_at: imported > 0 ? new Date().toISOString() : null,
    found_last_run: imported,
    found_24h: imported,
    consecutive_zero_runs: imported > 0 ? 0 : 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: "source" });

  return jsonResponse({ ok: true, batch_id: batchId, imported, verified, queued, sent, errors, results, send_result: sendResult });
});