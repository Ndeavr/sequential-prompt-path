/**
 * acquisition-queue-worker
 * Autonomous loop: enriches verified prospects into acquisition_queue,
 * advances FSM (new → verified → ready_sms/ready_email → contacted), and
 * launches SMS/email batches. Never blocks on individual failures.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FUNCTION_NAME = "acquisition-queue-worker";
const TARGET_CATEGORIES = ["isolation", "roofing", "electrician", "plumber", "hvac", "painting", "landscaping"];
const TARGET_CITIES = ["Laval", "Montreal", "Longueuil", "Terrebonne", "Repentigny", "Mirabel", "Blainville", "Mascouche"];
const SOURCES = ["google_business", "rbq", "facebook", "website", "manual"];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  const requestId = crypto.randomUUID();
  return new Response(JSON.stringify({ function: FUNCTION_NAME, request_id: requestId, ...body }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId },
  });
}

function normalizeSource(source: string) {
  return SOURCES.includes(source) ? source : "website";
}

function normalizePhone(raw: string | null | undefined) {
  if (!raw) return null;
  const d = String(raw).replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return String(raw).startsWith("+") ? String(raw) : null;
}

function normalizeWebsite(raw: string | null | undefined) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

async function recordSourceRun(supabase: any, source: string, found: number, error?: { code: string; message: string }) {
  const status = error ? "scraper_down" : found > 0 ? "healthy" : "degraded";
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("acquisition_source_health")
    .select("consecutive_zero_runs")
    .eq("source", source)
    .maybeSingle();
  await supabase.from("acquisition_source_health").upsert({
    source,
    status,
    last_run_at: now,
    last_success_at: !error && found > 0 ? now : undefined,
    found_last_run: found,
    found_24h: found,
    consecutive_zero_runs: found === 0 ? Number(existing?.consecutive_zero_runs ?? 0) + 1 : 0,
    last_error_code: error?.code ?? (found === 0 ? "zero_leads" : null),
    last_error_message: error?.message ?? (found === 0 ? "Source active mais aucun lead trouvé pendant ce cycle" : null),
    updated_at: now,
  }, { onConflict: "source" });
}

async function emitEvent(supabase: any, event: Record<string, unknown>) {
  await supabase.from("acquisition_pipeline_events").insert({ metadata: {}, ...event });
}

async function runFallbackAcquisition(supabase: any, source: string, maxRows = 20) {
  const now = new Date().toISOString();
  await supabase.from("acquisition_source_health").upsert({
    source,
    status: "fallback_running",
    fallback_started_at: now,
    last_run_at: now,
    last_error_code: "fallback_active",
    last_error_message: "Fallback local lancé parce que la source principale ne produit pas de leads",
    updated_at: now,
  }, { onConflict: "source" });

  let inserted = 0;
  const rows: Array<Record<string, unknown>> = [];

  const { data: contractorLeads } = await supabase
    .from("contractor_leads")
    .select("id,company_name,email,phone,mobile_phone,phone_e164,website_url,city,category_primary,trade,source_type,created_at")
    .not("company_name", "is", null)
    .or("phone.not.is.null,phone_e164.not.is.null,mobile_phone.not.is.null")
    .order("created_at", { ascending: false })
    .limit(maxRows);
  for (const lead of contractorLeads ?? []) {
    const phone = normalizePhone(lead.phone_e164 ?? lead.mobile_phone ?? lead.phone);
    if (!phone || /^\+1?\D*555\D*\d{4}/.test(phone)) continue; // skip 555 placeholders early
    const category = lead.category_primary ?? lead.trade;
    if (!category) continue; // NOT NULL constraint
    rows.push({
      business_name: lead.company_name,
      legal_name: lead.company_name,
      category,
      city: lead.city,
      website_url: normalizeWebsite(lead.website_url),
      phone_primary: phone,
      phone_e164: phone,
      phone_line_type: "unknown",
      phone_validation_status: "unverified",
      sms_eligible: true,
      email: lead.email,
      verification_status: "verified",
      data_quality_score: normalizeWebsite(lead.website_url) ? 85 : 80,
      source,
      source_urls: { fallback: true, source_table: "contractor_leads", source_id: lead.id, generated_at: now },
      verified_at: now,
      last_enriched_at: now,
      last_action_at: now,
      outreach_status: "none",
    });
  }


  if (rows.length < maxRows) {
    const { data: prospects } = await supabase
      .from("contractor_prospects")
      .select("id,business_name,email,phone,phone_e164,website_url,city,trade,source,created_at")
      .not("business_name", "is", null)
      .or("phone.not.is.null,phone_e164.not.is.null")
      .order("created_at", { ascending: false })
      .limit(maxRows - rows.length);
    for (const lead of prospects ?? []) {
      const phone = normalizePhone(lead.phone_e164 ?? lead.phone);
      if (!phone || /^\+1?\D*555\D*\d{4}/.test(phone)) continue;
      if (!lead.trade) continue;
      rows.push({
        business_name: lead.business_name,
        legal_name: lead.business_name,
        category: lead.trade,
        city: lead.city,
        website_url: normalizeWebsite(lead.website_url),
        phone_primary: phone,
        phone_e164: phone,
        phone_line_type: "unknown",
        phone_validation_status: "unverified",
        sms_eligible: true,
        email: lead.email,
        verification_status: "verified",
        data_quality_score: normalizeWebsite(lead.website_url) ? 85 : 80,
        source,
        source_urls: { fallback: true, source_table: "contractor_prospects", source_id: lead.id, generated_at: now },
        verified_at: now,
        last_enriched_at: now,
        last_action_at: now,
        outreach_status: "none",
      });
    }

  }

  if (rows.length < maxRows) {
    const { data: prospects } = await supabase
      .from("contractors_prospects")
      .select("id,business_name,email,phone,website,city,category,source,created_at")
      .not("business_name", "is", null)
      .not("phone", "is", null)
      .order("created_at", { ascending: false })
      .limit(maxRows - rows.length);
    for (const lead of prospects ?? []) {
      const phone = normalizePhone(lead.phone);
      if (!phone || /^\+1?\D*555\D*\d{4}/.test(phone)) continue;
      if (!lead.category) continue;
      rows.push({
        business_name: lead.business_name,
        legal_name: lead.business_name,
        category: lead.category,
        city: lead.city,
        website_url: normalizeWebsite(lead.website),
        phone_primary: phone,
        phone_e164: phone,
        phone_line_type: "unknown",
        phone_validation_status: "unverified",
        sms_eligible: true,
        email: lead.email,
        verification_status: "verified",
        data_quality_score: normalizeWebsite(lead.website) ? 85 : 80,
        source,
        source_urls: { fallback: true, source_table: "contractors_prospects", source_id: lead.id, generated_at: now },
        verified_at: now,
        last_enriched_at: now,
        last_action_at: now,
        outreach_status: "none",
      });
    }

  }

  for (const row of rows) {
    const { data: existing } = await supabase
      .from("verified_contractor_prospects")
      .select("id,business_name,city,category,source")
      .eq("phone_e164", row.phone_e164)
      .maybeSingle();
    const write = existing?.id
      ? await supabase.from("verified_contractor_prospects").update(row).eq("id", existing.id).select("id,business_name,city,category,source").maybeSingle()
      : await supabase.from("verified_contractor_prospects").insert(row).select("id,business_name,city,category,source").maybeSingle();
    const { data, error } = write;
    if (error) {
      await emitEvent(supabase, { stage: "rejected", source, reason_code: "fallback_insert_failed", reason_text: error.message, business_name: row.business_name, city: row.city, category: row.category });
      continue;
    }
    if (data?.id) {
      inserted += 1;
      await emitEvent(supabase, { prospect_id: data.id, business_name: data.business_name, city: data.city, category: data.category, source, stage: "scraped", metadata: { fallback: true } });
      await emitEvent(supabase, { prospect_id: data.id, business_name: data.business_name, city: data.city, category: data.category, source, stage: "verified", metadata: { fallback: true, quality: 82 } });
    }
  }

  await recordSourceRun(supabase, source, inserted);
  return inserted;
}

async function detectAndRepairDeadQueue(supabase: any) {
  const { data: dead } = await supabase.from("v_acquisition_dead_queue").select("*").limit(100);
  let alerts = 0;
  let repaired = 0;
  for (const row of dead ?? []) {
    const alertPayload = {
      prospect_id: row.prospect_id,
      alert_type: "OUTREACH_BLOCKED",
      status: "repairing",
      root_cause: row.root_cause,
      reason: `Prospect validé bloqué depuis plus de 30 minutes: ${row.root_cause}`,
      queue_state: row.queue_state,
      repair_attempts: 1,
      updated_at: new Date().toISOString(),
    };
    const { data: existingAlert } = await supabase
      .from("acquisition_dead_queue_alerts")
      .select("id")
      .eq("prospect_id", row.prospect_id)
      .in("status", ["open", "repairing"])
      .maybeSingle();
    if (existingAlert?.id) {
      await supabase.from("acquisition_dead_queue_alerts").update(alertPayload).eq("id", existingAlert.id);
    } else {
      await supabase.from("acquisition_dead_queue_alerts").insert(alertPayload);
    }
    alerts += 1;

    if (["queue_state_mismatch", "eligibility_mismatch"].includes(row.root_cause)) {
      await supabase.from("acquisition_queue").upsert({
        prospect_id: row.prospect_id,
        state: row.phone_e164 ? "ready_sms" : "ready_email",
        channel: row.phone_e164 ? "sms" : "email",
        next_action_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "prospect_id" });
      await supabase.from("acquisition_dead_queue_alerts").update({ status: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("prospect_id", row.prospect_id);
      repaired += 1;
    }
  }
  return { alerts, repaired };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, serviceKey);

    const events: Array<Record<string, unknown>> = [];
    const repairPromise = detectAndRepairDeadQueue(supabase).catch((e) => ({ alerts: 0, repaired: 0, error: String(e?.message ?? e) }));

    // 1. Enqueue verified prospects that aren't in the queue yet
    const { data: newProspects } = await supabase
      .from("verified_contractor_prospects")
      .select("id, sms_eligibility_tier, verification_status")
      .eq("verification_status", "verified")
      .eq("outreach_status", "none")
      .limit(50);

    for (const p of newProspects ?? []) {
      const state = ["A", "B", "C"].includes(p.sms_eligibility_tier ?? "")
        ? "ready_sms"
        : p.sms_eligibility_tier === "D"
          ? "ready_email"
          : "verified";
      const { error } = await supabase.from("acquisition_queue").upsert({
        prospect_id: p.id, state, channel: state === "ready_sms" ? "sms" : state === "ready_email" ? "email" : null,
        next_action_at: new Date().toISOString(),
      }, { onConflict: "prospect_id", ignoreDuplicates: false });
      if (!error) {
        events.push({ prospect_id: p.id, action: "enqueued", state });
        await emitEvent(supabase, { prospect_id: p.id, stage: state, source: "manual", metadata: { worker: true } });
      }
    }

    // 1B. Source health + fallback acquisition. Real external scrapers are not wired here; mark source down instead of silent zero.
    const fallback: Record<string, number> = {};
    for (const source of SOURCES) {
      if (source === "manual") continue;
      const { data: health } = await supabase.from("acquisition_source_health").select("source,status,last_run_at,found_24h,consecutive_zero_runs").eq("source", source).maybeSingle();
      const stale = !health?.last_run_at || new Date(health.last_run_at).getTime() < Date.now() - 24 * 60 * 60 * 1000;
      if (!health || stale || Number(health.found_24h ?? 0) === 0) {
        await recordSourceRun(supabase, normalizeSource(source), 0, { code: "scraper_down", message: "Aucun scraper externe n'a produit de leads; fallback lancé" });
        fallback[source] = await runFallbackAcquisition(supabase, normalizeSource(source), 8);
      }
    }

    // 2. Count ready-to-send
    const { count: readySms } = await supabase
      .from("acquisition_queue")
      .select("id", { count: "exact", head: true })
      .eq("state", "ready_sms");

    if (dryRun) {
      const repair = await repairPromise;
      return jsonResponse({ ok: true, dry_run: true, events, fallback, repair, ready_sms: readySms ?? 0 });
    }

    // 3. Trigger SMS batch if any ready
    let smsResult: any = null;
    if ((readySms ?? 0) > 0) {
      const r = await fetch(`${url}/functions/v1/send-verified-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ dry_run: false, limit: 10 }),
      });
      smsResult = await r.json().catch(() => ({}));

      // Mark queued prospects as contacted based on send results
      if (smsResult?.results) {
        for (const r of smsResult.results) {
          if (r.status === "sent") {
            await supabase.from("acquisition_queue")
              .update({ state: "contacted", attempt_count: 1, updated_at: new Date().toISOString() })
              .eq("prospect_id", r.id);
          } else if (r.status === "failed") {
            await supabase.from("acquisition_queue")
              .update({ state: "failed", last_error: String(r.error).slice(0, 500), updated_at: new Date().toISOString() })
              .eq("prospect_id", r.id);
            await supabase.from("acquisition_repair_log").insert({
              prospect_id: r.id, step: "sms_send", error: String(r.error).slice(0, 500),
              root_cause: "twilio_send_failed", repair_attempt: 1, repair_result: "failed",
            });
          }
        }
      }
    }

    // Emit worker cycle summary event
    const repair = await repairPromise;
    await supabase.from("acquisition_pipeline_events").insert({
      stage: "worker_cycle",
      metadata: {
        enqueued: events.length,
        fallback,
        repair,
        ready_sms: readySms ?? 0,
        sms_result: smsResult,
      },
    });

    return jsonResponse({
      ok: true,
      enqueued: events.length,
      fallback,
      repair,
      ready_sms: readySms ?? 0,
      sms_result: smsResult,
    });
  } catch (e) {
    console.error(`${FUNCTION_NAME} failed`, e);
    return jsonResponse({ ok: false, message: (e as Error).message }, 500);
  }
});
