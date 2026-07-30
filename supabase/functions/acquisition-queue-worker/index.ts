/**
 * acquisition-queue-worker
 *
 * Autonomous + targeted acquisition pipeline.
 *
 * Modes (single shared code path):
 *   Autonomous : no `campaign` in body. Fair-queue selection across the whole
 *                pool, ordered by oldest incomplete first so no city/category
 *                is starved. Runs on cron; safe to rerun.
 *   Targeted   : body.campaign = { city, category, limit }. Same selection
 *                pre-filtered by city + normalized category. Auto-sends only
 *                the prospects prepared in *this* run.
 *
 * Every run is tagged with a single `run_id` (UUID) and every event insert
 * carries { run_id, mode, city, category } in `metadata` so the Admin UI can
 * render an accurate per-run funnel.
 *
 * Dry-run contract:
 *   { dry_run: true }  → no writes, no Twilio Lookup, no SMS. Returns preview
 *   counts only. Emits ONE `dry_run_preview` event tagged with run_id.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { CATEGORY_SYNONYMS, normalizeCategoryInput } from "../_shared/acquisitionPipeline.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FUNCTION_NAME = "acquisition-queue-worker";
const SOURCES = ["google_business", "rbq", "facebook", "website", "manual"];
const VERIFICATION_FRESHNESS_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const SEND_LIMIT_DEFAULT = 25;
const FAIR_SELECT_BATCH = 25;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
type DeterministicTarget = {
  contractor_lead_id?: string | null;
  contractor_prospect_id?: string | null;
  contractors_prospect_id?: string | null;
  business_name_exact?: string | null;
  business_name_ilike?: string | null;
  phone_e164?: string | null;
  email?: string | null;
};

type RunContext = {
  run_id: string;
  mode: "autonomous" | "targeted" | "deterministic";
  city: string | null;
  category: string | null;
  category_synonyms: string[] | null;
  dry_run: boolean;
  limit: number;
  target: DeterministicTarget | null;
};

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

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = String(raw).replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return String(raw).startsWith("+") ? String(raw) : null;
}

function isPlaceholderPhone(phone: string): boolean {
  return /555\d{4}$/.test(phone);
}

function normalizeWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

async function emitEvent(
  supabase: any,
  ctx: RunContext,
  evt: {
    prospect_id?: string | null;
    business_name?: string | null;
    city?: string | null;
    category?: string | null;
    source?: string | null;
    stage: string;
    reason_code?: string | null;
    reason_text?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await supabase.from("acquisition_pipeline_events").insert({
      prospect_id: evt.prospect_id ?? null,
      business_name: evt.business_name ?? null,
      city: evt.city ?? null,
      category: evt.category ?? null,
      source: evt.source ?? null,
      stage: evt.stage,
      reason_code: evt.reason_code ?? null,
      reason_text: evt.reason_text ?? null,
      metadata: {
        run_id: ctx.run_id,
        mode: ctx.mode,
        campaign_city: ctx.city,
        campaign_category: ctx.category,
        ...(evt.metadata ?? {}),
      },
    });
  } catch (e) {
    console.error("[emitEvent] failed", e);
  }
}

// ---------------------------------------------------------------------------
// Source-health / dead-queue helpers (preserved from previous implementation)
// ---------------------------------------------------------------------------
async function recordSourceRun(
  supabase: any,
  source: string,
  found: number,
  error?: { code: string; message: string },
) {
  const status = error ? "scraper_down" : found > 0 ? "healthy" : "degraded";
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("acquisition_source_health")
    .select("consecutive_zero_runs")
    .eq("source", source)
    .maybeSingle();
  await supabase.from("acquisition_source_health").upsert(
    {
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
    },
    { onConflict: "source" },
  );
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
      await supabase.from("acquisition_queue").upsert(
        {
          prospect_id: row.prospect_id,
          state: row.phone_e164 ? "ready_sms" : "ready_email",
          channel: row.phone_e164 ? "sms" : "email",
          next_action_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "prospect_id" },
      );
      await supabase
        .from("acquisition_dead_queue_alerts")
        .update({ status: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("prospect_id", row.prospect_id);
      repaired += 1;
    }
  }
  return { alerts, repaired };
}

// ---------------------------------------------------------------------------
// Fair-queue selection — replaces `order(created_at desc).limit(20)` starvation.
// Pulls the OLDEST unprocessed eligible records first, from all supported
// scrape tables. Applies optional city + normalized-category filter when
// running in targeted mode.
// ---------------------------------------------------------------------------
type CandidateLead = {
  business_name: string;
  phone_e164: string;
  website_url: string | null;
  city: string | null;
  category: string;
  email: string | null;
  source: string;
  source_table: string;
  source_id: string;
};

function passesCategory(ctx: RunContext, category: string | null): boolean {
  if (!ctx.category || !ctx.category_synonyms) return true; // autonomous mode
  if (!category) return false;
  const lower = String(category).trim().toLowerCase();
  return ctx.category_synonyms.some((s) => s.toLowerCase() === lower);
}

function passesCity(ctx: RunContext, city: string | null): boolean {
  if (!ctx.city) return true;
  if (!city) return false;
  return city.trim().toLowerCase().startsWith(ctx.city.trim().toLowerCase());
}

// Pool oversampling: already-contacted destinations must NOT consume the run
// limit. We gather a larger pool, drop historical duplicates, then cap to `take`.
async function filterAlreadyContacted(
  supabase: any,
  pool: CandidateLead[],
  take: number,
): Promise<CandidateLead[]> {
  if (pool.length === 0) return pool;
  const phones = pool.map((c) => c.phone_e164);
  const contacted = new Set<string>();

  const { data: priorProspects } = await supabase
    .from("verified_contractor_prospects")
    .select("phone_e164,outreach_status")
    .in("phone_e164", phones)
    .neq("outreach_status", "none");
  for (const r of priorProspects ?? []) if (r.phone_e164) contacted.add(r.phone_e164);

  const { data: priorLeads } = await supabase
    .from("contractor_leads")
    .select("phone_e164,last_sms_at")
    .in("phone_e164", phones)
    .not("last_sms_at", "is", null);
  for (const r of priorLeads ?? []) if (r.phone_e164) contacted.add(r.phone_e164);

  try {
    const { data: priorLogs } = await supabase
      .from("outreach_delivery_logs")
      .select("recipient_normalized")
      .in("recipient_normalized", phones);
    for (const r of priorLogs ?? []) if (r.recipient_normalized) contacted.add(r.recipient_normalized);
  } catch (_e) {
    // non-fatal — downstream checkHistoricalExclusion remains the hard guard
  }

  const fresh = pool.filter((c) => !contacted.has(c.phone_e164));
  // Never return an empty batch just because the pool was fully contacted:
  // downstream still enforces the hard exclusion, so fall back to the raw pool.
  return (fresh.length > 0 ? fresh : pool).slice(0, take);
}

async function selectFairCandidates(supabase: any, ctx: RunContext, take: number): Promise<CandidateLead[]> {
  const results: CandidateLead[] = [];
  const seenPhones = new Set<string>();
  const poolCap = Math.max(take * 10, 50);

  const push = (row: any, source: string, source_table: string, mapping: {
    business: string;
    phone: string | null;
    website: string | null;
    city: string | null;
    category: string | null;
    email: string | null;
  }) => {
    if (results.length >= poolCap) return;
    const phone = normalizePhone(mapping.phone);
    if (!phone || isPlaceholderPhone(phone)) return;
    if (seenPhones.has(phone)) return;
    if (!mapping.category) return;
    if (!passesCategory(ctx, mapping.category)) return;
    if (!passesCity(ctx, mapping.city)) return;
    seenPhones.add(phone);
    results.push({
      business_name: mapping.business,
      phone_e164: phone,
      website_url: normalizeWebsite(mapping.website),
      city: mapping.city,
      category: String(mapping.category),
      email: mapping.email,
      source,
      source_table,
      source_id: String(row.id),
    });
  };

  // Table 1 — contractor_leads (canonical). Prioritize never-contacted rows.
  {
    let q = supabase
      .from("contractor_leads")
      .select("id,company_name,email,phone,mobile_phone,phone_e164,website_url,city,category_primary,trade,source_type,created_at,last_sms_at")
      .not("company_name", "is", null)
      .or("phone.not.is.null,phone_e164.not.is.null,mobile_phone.not.is.null")
      .is("last_sms_at", null)
      .order("created_at", { ascending: true })
      .limit(poolCap);
    if (ctx.city) q = q.ilike("city", `${ctx.city}%`);
    const { data } = await q;
    for (const row of data ?? []) {
      push(row, normalizeSource(row.source_type ?? "website"), "contractor_leads", {
        business: row.company_name,
        phone: row.phone_e164 ?? row.mobile_phone ?? row.phone,
        website: row.website_url,
        city: row.city,
        category: row.category_primary ?? row.trade,
        email: row.email,
      });
    }
  }

  // Table 2 — contractor_prospects (scraper landing table)
  if (results.length < poolCap) {
    let q = supabase
      .from("contractor_prospects")
      .select("id,business_name,email,phone,phone_e164,website_url,city,trade,source,created_at")
      .not("business_name", "is", null)
      .or("phone.not.is.null,phone_e164.not.is.null")
      .order("created_at", { ascending: true })
      .limit(poolCap);
    if (ctx.city) q = q.ilike("city", `${ctx.city}%`);
    const { data } = await q;
    for (const row of data ?? []) {
      push(row, normalizeSource(row.source ?? "website"), "contractor_prospects", {
        business: row.business_name,
        phone: row.phone_e164 ?? row.phone,
        website: row.website_url,
        city: row.city,
        category: row.trade,
        email: row.email,
      });
    }
  }

  // Table 3 — contractors_prospects (legacy)
  if (results.length < poolCap) {
    let q = supabase
      .from("contractors_prospects")
      .select("id,business_name,email,phone,website,city,category,source,created_at")
      .not("business_name", "is", null)
      .not("phone", "is", null)
      .order("created_at", { ascending: true })
      .limit(poolCap);
    if (ctx.city) q = q.ilike("city", `${ctx.city}%`);
    const { data } = await q;
    for (const row of data ?? []) {
      push(row, normalizeSource(row.source ?? "website"), "contractors_prospects", {
        business: row.business_name,
        phone: row.phone,
        website: row.website,
        city: row.city,
        category: row.category,
        email: row.email,
      });
    }
  }

  return await filterAlreadyContacted(supabase, results, take);
}

// ---------------------------------------------------------------------------
// Deterministic candidate selection — bypasses scoring/last_sms_at gating.
// Pulls ONLY rows matching the explicit filters (contractor IDs, exact/ilike
// business name, phone E.164, or email) across the three source tables.
// Category/city are NOT applied here — deterministic mode trusts the caller.
// ---------------------------------------------------------------------------
async function selectDeterministicCandidates(
  supabase: any,
  ctx: RunContext,
  take: number,
): Promise<CandidateLead[]> {
  const t = ctx.target;
  if (!t) return [];
  const results: CandidateLead[] = [];
  const seenPhones = new Set<string>();

  const pushRow = (
    row: any,
    source: string,
    source_table: string,
    mapping: {
      business: string;
      phone: string | null;
      website: string | null;
      city: string | null;
      category: string | null;
      email: string | null;
    },
  ) => {
    if (results.length >= take) return;
    const phone = normalizePhone(mapping.phone);
    if (!phone || isPlaceholderPhone(phone)) return;
    if (seenPhones.has(phone)) return;
    seenPhones.add(phone);
    results.push({
      business_name: mapping.business,
      phone_e164: phone,
      website_url: normalizeWebsite(mapping.website),
      city: mapping.city,
      category: String(mapping.category ?? "unknown"),
      email: mapping.email,
      source,
      source_table,
      source_id: String(row.id),
    });
  };

  const applyFilters = (q: any, cols: { business: string; phone: string; email: string }) => {
    if (t.business_name_exact) q = q.eq(cols.business, t.business_name_exact);
    else if (t.business_name_ilike) q = q.ilike(cols.business, `%${t.business_name_ilike}%`);
    if (t.phone_e164) {
      const p = normalizePhone(t.phone_e164);
      if (p) q = q.or(`${cols.phone}.eq.${p},phone_e164.eq.${p}`);
    }
    if (t.email) q = q.eq(cols.email, t.email);
    return q;
  };

  // contractor_leads
  if (results.length < take) {
    if (t.contractor_lead_id) {
      const { data } = await supabase
        .from("contractor_leads")
        .select("id,company_name,email,phone,mobile_phone,phone_e164,website_url,city,category_primary,trade,source_type")
        .eq("id", t.contractor_lead_id)
        .limit(1);
      for (const row of data ?? []) {
        pushRow(row, normalizeSource(row.source_type ?? "website"), "contractor_leads", {
          business: row.company_name,
          phone: row.phone_e164 ?? row.mobile_phone ?? row.phone,
          website: row.website_url,
          city: row.city,
          category: row.category_primary ?? row.trade,
          email: row.email,
        });
      }
    }
    if (results.length < take && (t.business_name_exact || t.business_name_ilike || t.phone_e164 || t.email)) {
      let q = supabase
        .from("contractor_leads")
        .select("id,company_name,email,phone,mobile_phone,phone_e164,website_url,city,category_primary,trade,source_type")
        .not("company_name", "is", null)
        .limit(take);
      q = applyFilters(q, { business: "company_name", phone: "phone", email: "email" });
      const { data } = await q;
      for (const row of data ?? []) {
        pushRow(row, normalizeSource(row.source_type ?? "website"), "contractor_leads", {
          business: row.company_name,
          phone: row.phone_e164 ?? row.mobile_phone ?? row.phone,
          website: row.website_url,
          city: row.city,
          category: row.category_primary ?? row.trade,
          email: row.email,
        });
      }
    }
  }

  // contractor_prospects
  if (results.length < take) {
    if (t.contractor_prospect_id) {
      const { data } = await supabase
        .from("contractor_prospects")
        .select("id,business_name,email,phone,phone_e164,website_url,city,trade,source")
        .eq("id", t.contractor_prospect_id)
        .limit(1);
      for (const row of data ?? []) {
        pushRow(row, normalizeSource(row.source ?? "website"), "contractor_prospects", {
          business: row.business_name,
          phone: row.phone_e164 ?? row.phone,
          website: row.website_url,
          city: row.city,
          category: row.trade,
          email: row.email,
        });
      }
    }
    if (results.length < take && (t.business_name_exact || t.business_name_ilike || t.phone_e164 || t.email)) {
      let q = supabase
        .from("contractor_prospects")
        .select("id,business_name,email,phone,phone_e164,website_url,city,trade,source")
        .not("business_name", "is", null)
        .limit(take);
      q = applyFilters(q, { business: "business_name", phone: "phone", email: "email" });
      const { data } = await q;
      for (const row of data ?? []) {
        pushRow(row, normalizeSource(row.source ?? "website"), "contractor_prospects", {
          business: row.business_name,
          phone: row.phone_e164 ?? row.phone,
          website: row.website_url,
          city: row.city,
          category: row.trade,
          email: row.email,
        });
      }
    }
  }

  // contractors_prospects (legacy)
  if (results.length < take) {
    if (t.contractors_prospect_id) {
      const { data } = await supabase
        .from("contractors_prospects")
        .select("id,business_name,email,phone,website,city,category,source")
        .eq("id", t.contractors_prospect_id)
        .limit(1);
      for (const row of data ?? []) {
        pushRow(row, normalizeSource(row.source ?? "website"), "contractors_prospects", {
          business: row.business_name,
          phone: row.phone,
          website: row.website,
          city: row.city,
          category: row.category,
          email: row.email,
        });
      }
    }
    if (results.length < take && (t.business_name_exact || t.business_name_ilike || t.phone_e164 || t.email)) {
      let q = supabase
        .from("contractors_prospects")
        .select("id,business_name,email,phone,website,city,category,source")
        .not("business_name", "is", null)
        .not("phone", "is", null)
        .limit(take);
      q = applyFilters(q, { business: "business_name", phone: "phone", email: "email" });
      const { data } = await q;
      for (const row of data ?? []) {
        pushRow(row, normalizeSource(row.source ?? "website"), "contractors_prospects", {
          business: row.business_name,
          phone: row.phone,
          website: row.website,
          city: row.city,
          category: row.category,
          email: row.email,
        });
      }
    }
  }

  return results.slice(0, take);
}

// ---------------------------------------------------------------------------
// Idempotent promotion into verified_contractor_prospects.
// Never overwrites human-verified fields; only fills nulls / stale values.
// ---------------------------------------------------------------------------
type PromotedProspect = {
  id: string;
  business_name: string;
  city: string | null;
  category: string;
  phone_e164: string;
  phone_line_type: string | null;
  verification_status: string | null;
  verified_at: string | null;
  sms_eligibility_tier: string | null;
  sms_eligible: boolean | null;
  outreach_status: string | null;
  source: string | null;
  website_url: string | null;
  email: string | null;
  is_new: boolean;
};

async function promoteProspect(
  supabase: any,
  ctx: RunContext,
  lead: CandidateLead,
): Promise<{ prospect: PromotedProspect | null; reason?: string; detail?: string }> {
  // Use LIMIT(1) instead of maybeSingle() — several verified_contractor_prospects
  // rows may share the same phone_e164 (legacy backfills), which crashed maybeSingle
  // and silently quarantined every candidate.
  const { data: existingRows, error: readErr } = await supabase
    .from("verified_contractor_prospects")
    .select("id,business_name,city,category,phone_e164,phone_line_type,verification_status,verified_at,sms_eligibility_tier,sms_eligible,outreach_status,source,website_url,email")
    .eq("phone_e164", lead.phone_e164)
    .order("verified_at", { ascending: false, nullsFirst: false })
    .limit(1);
  if (readErr) {
    console.error("[promote] read failed", readErr);
    return { prospect: null, reason: "read_failed", detail: readErr.message };
  }
  const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

  const now = new Date().toISOString();

  if (existing?.id) {
    // Heal stale/backfilled rows: if the tier or line_type is missing we MUST
    // force a fresh Twilio Lookup, so downgrade verification_status here.
    const stale = !existing.phone_line_type
      || !["mobile", "landline", "voip"].includes(existing.phone_line_type)
      || !existing.sms_eligibility_tier
      || !["A", "B", "C", "D"].includes(existing.sms_eligibility_tier);

    const patch: Record<string, unknown> = { updated_at: now };
    if (!existing.website_url && lead.website_url) patch.website_url = lead.website_url;
    if (!existing.city && lead.city) patch.city = lead.city;
    if (!existing.category && lead.category) patch.category = lead.category;
    if (!existing.email && lead.email) patch.email = lead.email;
    if (!existing.source) patch.source = lead.source;
    if (stale && existing.verification_status === "verified") {
      patch.verification_status = "needs_enrichment";
      patch.phone_validation_status = "unverified";
    }

    if (Object.keys(patch).length > 1) {
      await supabase.from("verified_contractor_prospects").update(patch).eq("id", existing.id);
    }
    await emitEvent(supabase, ctx, {
      prospect_id: existing.id,
      business_name: existing.business_name,
      city: existing.city,
      category: existing.category,
      source: existing.source,
      stage: "promoted",
      metadata: {
        existing: true,
        source_table: lead.source_table,
        source_id: lead.source_id,
        patch_keys: Object.keys(patch),
        forced_re_verification: stale,
      },
    });
    const returned = { ...(existing as any) };
    if (stale) {
      returned.verification_status = null;
      returned.phone_line_type = existing.phone_line_type ?? null;
      returned.sms_eligibility_tier = existing.sms_eligibility_tier ?? null;
    }
    return { prospect: { ...returned, is_new: false } };
  }

  // Defensive: category is NOT NULL in DB. Skip with distinct code so the
  // failure counter isn't polluted by promotion_insert_failed.
  const safeCategory = (lead.category ?? "").trim();
  if (!safeCategory) {
    await emitEvent(supabase, ctx, {
      business_name: lead.business_name,
      city: lead.city,
      source: lead.source,
      stage: "rejected",
      reason_code: "category_missing",
      reason_text: "candidate has empty category; insert would violate NOT NULL",
      metadata: { phone_e164: lead.phone_e164, source_table: lead.source_table, source_id: lead.source_id, run_id: ctx.run_id },
    });
    return { prospect: null, reason: "category_missing" };
  }

  // Insert new — omit verification_status so the DB default 'needs_enrichment'
  // applies (NOT NULL). Omit phone_line_type so its default (NULL) applies.
  // phone_validation_status must be one of the allowed enum values; 'unverified' is valid.
  const row: Record<string, unknown> = {
    business_name: lead.business_name,
    legal_name: lead.business_name,
    category: safeCategory,
    city: lead.city,
    website_url: lead.website_url,
    phone_primary: lead.phone_e164,
    phone_e164: lead.phone_e164,
    phone_validation_status: "unverified",
    sms_eligible: false,
    email: lead.email,
    data_quality_score: lead.website_url ? 85 : 80,
    source: lead.source,
    source_urls: { source_table: lead.source_table, source_id: lead.source_id, promoted_at: now, run_id: ctx.run_id },
    last_enriched_at: now,
    last_action_at: now,
    outreach_status: "none",
  };
  // Idempotent: partial unique index verified_prospects_phone_uk (WHERE phone_e164 IS NOT NULL)
  // ON CONFLICT with a partial index requires an index-predicate inference the JS client cannot emit,
  // so we do select-then-insert-or-update manually.
  let inserted: any = null;
  let opError: any = null;
  let operation: "insert" | "update" = "insert";
  const returningCols = "id,business_name,city,category,phone_e164,phone_line_type,verification_status,verified_at,sms_eligibility_tier,sms_eligible,outreach_status,source,website_url,email";
  if (lead.phone_e164) {
    const { data: existing } = await supabase
      .from("verified_contractor_prospects")
      .select("id")
      .eq("phone_e164", lead.phone_e164)
      .limit(1);
    if (existing && existing.length > 0) {
      operation = "update";
      const { data: updated, error: updErr } = await supabase
        .from("verified_contractor_prospects")
        .update({ ...row, updated_at: now })
        .eq("id", existing[0].id)
        .select(returningCols)
        .limit(1);
      inserted = updated?.[0] ?? null;
      opError = updErr;
    }
  }
  if (!inserted && !opError) {
    const { data: insData, error: insErr2 } = await supabase
      .from("verified_contractor_prospects")
      .insert(row)
      .select(returningCols)
      .limit(1);
    inserted = insData?.[0] ?? null;
    opError = insErr2;
  }
  if (opError) {
    const err = opError as any;
    await emitEvent(supabase, ctx, {
      business_name: lead.business_name,
      city: lead.city,
      category: safeCategory,
      source: lead.source,
      stage: "rejected",
      reason_code: "promotion_insert_failed",
      reason_text: opError.message,
      metadata: {
        pg_code: err.code ?? null,
        pg_details: err.details ?? null,
        pg_hint: err.hint ?? null,
        target_table: "verified_contractor_prospects",
        operation,
        phone_e164: lead.phone_e164,
        run_id: ctx.run_id,
        source_table: lead.source_table,
        source_id: lead.source_id,
        payload_keys: Object.keys(row),
      },
    });
    return { prospect: null, reason: "promotion_insert_failed", detail: opError.message };
  }
  if (!inserted?.id) return { prospect: null, reason: "promotion_insert_returned_null" };

  await emitEvent(supabase, ctx, {
    prospect_id: inserted.id,
    business_name: inserted.business_name,
    city: inserted.city,
    category: inserted.category,
    source: inserted.source,
    stage: "promoted",
    metadata: { existing: false, source_table: lead.source_table, source_id: lead.source_id, run_id: ctx.run_id },
  });
  return { prospect: { ...(inserted as any), is_new: true } };
}

// ---------------------------------------------------------------------------
// Verification-reuse gate — do NOT re-spend Twilio Lookup on valid records.
// ---------------------------------------------------------------------------
function verificationIsFresh(p: PromotedProspect): boolean {
  if (p.verification_status !== "verified") return false;
  if (!p.phone_line_type || !["mobile", "landline", "voip"].includes(p.phone_line_type)) return false;
  if (!p.verified_at) return false;
  const age = Date.now() - new Date(p.verified_at).getTime();
  return age < VERIFICATION_FRESHNESS_MS;
}

// ---------------------------------------------------------------------------
// Historical-destination exclusion — check BEFORE any paid Twilio Lookup.
// ---------------------------------------------------------------------------
async function checkHistoricalExclusion(
  supabase: any,
  p: PromotedProspect,
): Promise<{ excluded: true; reason_code: string; source: string } | { excluded: false }> {
  // Source A — verified_contractor_prospects with outreach already sent (other rows / same row previously)
  const { data: prior } = await supabase
    .from("verified_contractor_prospects")
    .select("id,outreach_status,outreach_sent_at,outreach_twilio_sid")
    .eq("phone_e164", p.phone_e164)
    .neq("outreach_status", "none")
    .neq("id", p.id)
    .limit(1)
    .maybeSingle();
  if (prior?.id) return { excluded: true, reason_code: "history_prospect_contacted", source: `verified_contractor_prospects#${prior.id}` };
  // Also: this prospect itself already sent
  if (p.outreach_status && p.outreach_status !== "none") {
    return { excluded: true, reason_code: "history_prospect_contacted", source: `verified_contractor_prospects#${p.id}(self)` };
  }
  // Source B — contractor_leads.last_sms_at IS NOT NULL for this destination
  const { data: leadHit } = await supabase
    .from("contractor_leads")
    .select("id,last_sms_at")
    .eq("phone_e164", p.phone_e164)
    .not("last_sms_at", "is", null)
    .limit(1)
    .maybeSingle();
  if (leadHit?.id) return { excluded: true, reason_code: "history_contractor_leads", source: `contractor_leads#${leadHit.id}` };
  // Source C — outreach_delivery_logs (best-effort; skip silently if absent).
  // NOTE: outreach_delivery_logs stores the destination in `recipient_normalized`
  // (E.164 for SMS). The legacy `phone_e164` column does NOT exist on this table
  // and querying it caused the duplicate-SMS guard to silently fail.
  try {
    const { data: logHit } = await supabase
      .from("outreach_delivery_logs")
      .select("id")
      .eq("recipient_normalized", p.phone_e164)
      .limit(1)
      .maybeSingle();
    if (logHit?.id) return { excluded: true, reason_code: "history_delivery_logs", source: `outreach_delivery_logs#${logHit.id}` };
  } catch (_e) {
    // Table may be named differently in some envs — non-fatal.
  }
  return { excluded: false };
}

// ---------------------------------------------------------------------------
// Twilio Lookup via existing shared function (no direct provider call here).
// ---------------------------------------------------------------------------
async function callTwilioLookup(url: string, serviceKey: string, phone: string): Promise<{
  ok: boolean;
  phone_type: "mobile" | "landline" | "voip" | "unknown";
  number_valid: boolean;
  lti_available: boolean;
  raw?: unknown;
  error?: string;
}> {
  try {
    const r = await fetch(`${url}/functions/v1/twilio-lookup-phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ phone, force: true }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body?.error) {
      return { ok: false, phone_type: "unknown", number_valid: false, lti_available: false, raw: body, error: String(body?.error ?? `HTTP ${r.status}`) };
    }
    const type = String(body?.phone_type ?? "unknown");
    const normalized = (["mobile", "landline", "voip"].includes(type) ? type : "unknown") as "mobile" | "landline" | "voip" | "unknown";
    return {
      ok: true,
      phone_type: normalized,
      number_valid: body?.number_valid === true || body?.phone_verified === true,
      lti_available: body?.lti_available === true,
      raw: body,
    };
  } catch (e) {
    return { ok: false, phone_type: "unknown", number_valid: false, lti_available: false, error: String((e as Error).message ?? e) };
  }
}

function mapEligibility(phone_type: "mobile" | "landline" | "voip" | "unknown", number_valid: boolean): {
  sms_eligibility_tier: string | null;
  sms_eligible: boolean;
  verification_status: string;
} {
  switch (phone_type) {
    case "mobile":
      return { sms_eligibility_tier: "A", sms_eligible: true, verification_status: "verified" };
    case "voip":
      return { sms_eligibility_tier: "B", sms_eligible: true, verification_status: "verified" };
    case "landline":
      // Landline: still "verified" so email fallback path can pick it up.
      return { sms_eligibility_tier: "D", sms_eligible: false, verification_status: "verified" };
    default:
      // Unknown line type (typical for CA when LTI is unavailable).
      // If the number is structurally valid we still verify and let the trigger
      // assign tier C, which means "attempt SMS with automatic email fallback".
      if (number_valid) {
        return { sms_eligibility_tier: "C", sms_eligible: true, verification_status: "verified" };
      }
      return { sms_eligibility_tier: null, sms_eligible: false, verification_status: "needs_enrichment" };
  }
}

// ---------------------------------------------------------------------------
// Deno.serve
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    // Honor dry_run at both top level and inside campaign payload (Admin UI passes it inside campaign).
    const dryRun = body.dry_run === true || body?.campaign?.dry_run === true;
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, serviceKey);

    // ------------------------------------------------------------------
    // Build run context
    // ------------------------------------------------------------------
    const campaign = body.campaign ?? null;
    const rawTarget = body.target ?? null;
    const target: DeterministicTarget | null = rawTarget && typeof rawTarget === "object" ? {
      contractor_lead_id: rawTarget.contractor_lead_id ?? null,
      contractor_prospect_id: rawTarget.contractor_prospect_id ?? null,
      contractors_prospect_id: rawTarget.contractors_prospect_id ?? null,
      business_name_exact: rawTarget.business_name_exact ?? null,
      business_name_ilike: rawTarget.business_name_ilike ?? null,
      phone_e164: rawTarget.phone_e164 ?? null,
      email: rawTarget.email ?? null,
    } : null;
    const hasTarget = !!target && Object.values(target).some((v) => v !== null && v !== "");
    const catNorm = campaign?.category ? normalizeCategoryInput(campaign.category) : null;
    const ctx: RunContext = {
      run_id: (typeof body.run_id === "string" && body.run_id) || crypto.randomUUID(),
      mode: hasTarget ? "deterministic" : (campaign ? "targeted" : "autonomous"),
      city: campaign?.city ? String(campaign.city) : null,
      category: catNorm?.bucket ?? null,
      category_synonyms: catNorm?.synonyms ?? null,
      dry_run: dryRun,
      limit: Math.max(1, Math.min(Number(body.limit ?? campaign?.limit ?? SEND_LIMIT_DEFAULT), 50)),
      target: hasTarget ? target : null,
    };


    // ------------------------------------------------------------------
    // Autonomous side-tasks (dead-queue repair + queue enqueue) — skipped
    // in dry-run to keep zero writes.
    // ------------------------------------------------------------------
    let repair: any = null;
    if (!dryRun) {
      repair = await detectAndRepairDeadQueue(supabase).catch((e) => ({ alerts: 0, repaired: 0, error: String(e?.message ?? e) }));
      // Enqueue already-verified prospects that aren't in the queue yet
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
        await supabase.from("acquisition_queue").upsert(
          {
            prospect_id: p.id,
            state,
            channel: state === "ready_sms" ? "sms" : state === "ready_email" ? "email" : null,
            next_action_at: new Date().toISOString(),
          },
          { onConflict: "prospect_id", ignoreDuplicates: false },
        );
      }
    }

    // ------------------------------------------------------------------
    // Fair-queue selection
    // ------------------------------------------------------------------
    const take = ctx.mode === "autonomous" ? FAIR_SELECT_BATCH : ctx.limit;
    const candidates = ctx.mode === "deterministic"
      ? await selectDeterministicCandidates(supabase, ctx, take)
      : await selectFairCandidates(supabase, ctx, take);

    const counts = {
      matched: candidates.length,
      already_promoted: 0,
      already_verified: 0,
      verification_reused: 0,
      lookup_required: 0,
      twilio_lookups_executed: 0,
      historically_excluded: 0,
      missing_or_invalid_phone: 0,
      potentially_sms_eligible: 0,
      quarantined: 0,
      lookup_failed: 0,
      tier_A_mobile: 0,
      other_eligible: 0,
    };
    const preparedIds: string[] = [];
    const perProspect: any[] = [];

    // ------------------------------------------------------------------
    // DRY RUN — inspect only, no writes, no billable calls
    // ------------------------------------------------------------------
    if (dryRun) {
      for (const lead of candidates) {
        const { data: existingRows } = await supabase
          .from("verified_contractor_prospects")
          .select("id,verification_status,phone_line_type,verified_at,outreach_status,sms_eligibility_tier")
          .eq("phone_e164", lead.phone_e164)
          .order("verified_at", { ascending: false, nullsFirst: false })
          .limit(1);
        const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

        // Historical exclusion
        const histCheck = await checkHistoricalExclusion(supabase, {
          id: existing?.id ?? "",
          business_name: lead.business_name,
          city: lead.city,
          category: lead.category,
          phone_e164: lead.phone_e164,
          phone_line_type: existing?.phone_line_type ?? null,
          verification_status: existing?.verification_status ?? null,
          verified_at: existing?.verified_at ?? null,
          sms_eligibility_tier: existing?.sms_eligibility_tier ?? null,
          sms_eligible: null,
          outreach_status: existing?.outreach_status ?? null,
          source: lead.source,
          website_url: lead.website_url,
          email: lead.email,
          is_new: !existing?.id,
        });

        if (existing?.id) counts.already_promoted += 1;

        let bucket: string;
        if (histCheck.excluded) {
          counts.historically_excluded += 1;
          bucket = "historically_excluded";
        } else if (existing?.id && verificationIsFresh({
          id: existing.id,
          business_name: lead.business_name,
          city: lead.city,
          category: lead.category,
          phone_e164: lead.phone_e164,
          phone_line_type: existing.phone_line_type,
          verification_status: existing.verification_status,
          verified_at: existing.verified_at,
          sms_eligibility_tier: existing.sms_eligibility_tier,
          sms_eligible: null,
          outreach_status: existing.outreach_status,
          source: lead.source,
          website_url: lead.website_url,
          email: lead.email,
          is_new: false,
        })) {
          counts.already_verified += 1;
          counts.verification_reused += 1;
          if (existing.phone_line_type === "mobile") {
            counts.tier_A_mobile += 1;
            counts.potentially_sms_eligible += 1;
          } else if (existing.phone_line_type === "voip") {
            counts.other_eligible += 1;
            counts.potentially_sms_eligible += 1;
          }
          bucket = "verification_reused";
        } else {
          counts.lookup_required += 1;
          counts.potentially_sms_eligible += 1; // estimate
          bucket = "lookup_required";
        }

        perProspect.push({
          business_name: lead.business_name,
          city: lead.city,
          category: lead.category,
          phone_e164_masked: lead.phone_e164.replace(/(\+\d{4})\d+(\d{2})/, "$1***$2"),
          existing_prospect_id: existing?.id ?? null,
          bucket,
          historical_reason: histCheck.excluded ? (histCheck as any).reason_code : null,
          historical_source: histCheck.excluded ? (histCheck as any).source : null,
          phone_line_type: existing?.phone_line_type ?? null,
          verified_at: existing?.verified_at ?? null,
        });
      }

      await emitEvent(supabase, ctx, {
        stage: "dry_run_preview",
        metadata: { counts, sample_size: perProspect.length, notes: "potentially_sms_eligible is an estimate until Twilio Lookup runs" },
      });

      return jsonResponse({
        ok: true,
        dry_run: true,
        run_id: ctx.run_id,
        mode: ctx.mode,
        city: ctx.city,
        category: ctx.category,
        limit: ctx.limit,
        counts,
        prospects: perProspect,
      });
    }

    // ------------------------------------------------------------------
    // LIVE run — promote → historical check → verify (reuse or Lookup) → send
    // ------------------------------------------------------------------
    if (candidates.length === 0) {
      await emitEvent(supabase, ctx, {
        stage: "worker_cycle",
        reason_code: "fair_selection_empty",
        metadata: { counts, repair, mode: ctx.mode },
      });
      return jsonResponse({ ok: true, run_id: ctx.run_id, mode: ctx.mode, counts, repair, prospects: [], sms_result: null });
    }

    // Emit queued event per candidate for UI stage strip
    for (const lead of candidates) {
      await emitEvent(supabase, ctx, {
        business_name: lead.business_name,
        city: lead.city,
        category: lead.category,
        source: lead.source,
        stage: "queued",
        metadata: { source_table: lead.source_table, source_id: lead.source_id },
      });
    }

    for (const lead of candidates) {
      const promoteResult = await promoteProspect(supabase, ctx, lead);
      const promoted = promoteResult.prospect;
      if (!promoted) {
        counts.quarantined += 1;
        await emitEvent(supabase, ctx, {
          business_name: lead.business_name,
          city: lead.city,
          category: lead.category,
          source: lead.source,
          stage: "quarantined",
          reason_code: promoteResult.reason ?? "promotion_failed",
          reason_text: promoteResult.detail ?? null,
          metadata: { phone_e164: lead.phone_e164 },
        });
        perProspect.push({
          business_name: lead.business_name,
          outcome: "quarantined",
          reason: promoteResult.reason ?? "promotion_failed",
        });
        continue;
      }
      if (!promoted.is_new) counts.already_promoted += 1;

      // Historical exclusion FIRST (before any paid Lookup)
      const hist = await checkHistoricalExclusion(supabase, promoted);
      if (hist.excluded) {
        counts.historically_excluded += 1;
        await supabase
          .from("verified_contractor_prospects")
          .update({
            outreach_status: promoted.outreach_status === "none" ? "excluded" : promoted.outreach_status,
            rejection_reason_code: hist.reason_code,
            rejection_reason_text: hist.source,
            last_action_at: new Date().toISOString(),
          })
          .eq("id", promoted.id);
        await emitEvent(supabase, ctx, {
          prospect_id: promoted.id,
          business_name: promoted.business_name,
          city: promoted.city,
          category: promoted.category,
          source: promoted.source,
          stage: "excluded_history",
          reason_code: hist.reason_code,
          reason_text: hist.source,
          metadata: {},
        });
        perProspect.push({ id: promoted.id, business_name: promoted.business_name, outcome: "excluded_history", reason: hist.reason_code });
        continue;
      }

      // Verification reuse gate
      if (verificationIsFresh(promoted)) {
        counts.verification_reused += 1;
        counts.already_verified += 1;
        if (promoted.phone_line_type === "mobile") counts.tier_A_mobile += 1;
        else counts.other_eligible += 1;
        await emitEvent(supabase, ctx, {
          prospect_id: promoted.id,
          business_name: promoted.business_name,
          city: promoted.city,
          category: promoted.category,
          source: promoted.source,
          stage: "verification_reused",
          metadata: {
            phone_line_type: promoted.phone_line_type,
            sms_eligibility_tier: promoted.sms_eligibility_tier,
            verified_at: promoted.verified_at,
          },
        });
        const smsEligibleTier = ["A", "B", "C"].includes(promoted.sms_eligibility_tier ?? "");
        const emailOnlyFallback = !smsEligibleTier && !!promoted.email;
        if ((promoted.sms_eligible && smsEligibleTier) || emailOnlyFallback) {
          preparedIds.push(promoted.id);
        }
        perProspect.push({
          id: promoted.id,
          business_name: promoted.business_name,
          outcome: "verification_reused",
          tier: promoted.sms_eligibility_tier,
          channel_planned: smsEligibleTier ? "sms" : (emailOnlyFallback ? "email" : "none"),
        });
        continue;
      }

      // Fresh Twilio Lookup required
      counts.lookup_required += 1;
      const lookup = await callTwilioLookup(url, serviceKey, promoted.phone_e164);
      counts.twilio_lookups_executed += 1;

      if (!lookup.ok) {
        counts.lookup_failed += 1;
        counts.quarantined += 1;
        await supabase
          .from("verified_contractor_prospects")
          .update({
            // 'lookup_failed' is NOT in the enum check for these columns.
            // Use allowed values: verification_status ∈ (verified|needs_enrichment|invalid|duplicate);
            // phone_validation_status ∈ (valid_mobile|valid_sms_capable_voip|landline|invalid|disconnected|unverified).
            verification_status: "needs_enrichment",
            phone_validation_status: "unverified",
            sms_eligible: false,
            sms_eligibility_tier: null,
            rejection_reason_code: "lookup_provider_failed",
            rejection_reason_text: (lookup.error ?? "twilio lookup failed").slice(0, 300),
            last_action_at: new Date().toISOString(),
          })
          .eq("id", promoted.id);
        await emitEvent(supabase, ctx, {
          prospect_id: promoted.id,
          business_name: promoted.business_name,
          city: promoted.city,
          category: promoted.category,
          source: promoted.source,
          stage: "lookup_failed",
          reason_code: "lookup_provider_failed",
          reason_text: lookup.error ?? null,
          metadata: { raw: lookup.raw ?? null },
        });
        perProspect.push({ id: promoted.id, business_name: promoted.business_name, outcome: "lookup_failed" });
        continue;
      }

      const elig = mapEligibility(lookup.phone_type, lookup.number_valid);
      const nowIso = new Date().toISOString();
      const phoneValStatus =
        lookup.phone_type === "mobile" ? "valid_mobile" :
        lookup.phone_type === "voip"   ? "valid_sms_capable_voip" :
        lookup.phone_type === "landline" ? "landline" :
        "unverified";
      await supabase
        .from("verified_contractor_prospects")
        .update({
          phone_line_type: lookup.phone_type,
          phone_validation_status: phoneValStatus,
          sms_eligible: elig.sms_eligible,
          sms_eligibility_tier: elig.sms_eligibility_tier,
          verification_status: elig.verification_status,
          verified_at: elig.verification_status === "verified" ? nowIso : promoted.verified_at,
          last_enriched_at: nowIso,
          last_action_at: nowIso,
        })
        .eq("id", promoted.id);

      // Only quarantine when the number itself is invalid AND there is no email.
      // LTI-unavailable (Canada) still returns lookup.phone_type='unknown' but
      // lookup.number_valid=true — we no longer quarantine that path.
      if (lookup.phone_type === "unknown" && !lookup.number_valid && !promoted.email) {
        counts.quarantined += 1;
        await emitEvent(supabase, ctx, {
          prospect_id: promoted.id,
          business_name: promoted.business_name,
          city: promoted.city,
          category: promoted.category,
          source: promoted.source,
          stage: "quarantined",
          reason_code: "invalid_phone_no_email",
          metadata: { raw: lookup.raw ?? null, lti_available: lookup.lti_available },
        });
        perProspect.push({ id: promoted.id, business_name: promoted.business_name, outcome: "quarantined" });
        continue;
      }

      await emitEvent(supabase, ctx, {
        prospect_id: promoted.id,
        business_name: promoted.business_name,
        city: promoted.city,
        category: promoted.category,
        source: promoted.source,
        stage: "verified",
        metadata: {
          phone_line_type: lookup.phone_type,
          sms_eligibility_tier: elig.sms_eligibility_tier,
          lti_available: lookup.lti_available,
          number_valid: lookup.number_valid,
        },
      });

      if (lookup.phone_type === "mobile") counts.tier_A_mobile += 1;
      else counts.other_eligible += 1;

      // Prepare for send whenever we have ANY viable channel: SMS-eligible tier
      // OR a landline/unknown with an email on file (email-only fallback).
      const smsEligibleTier = ["A", "B", "C"].includes(elig.sms_eligibility_tier ?? "");
      const emailOnlyFallback = !smsEligibleTier && !!promoted.email;
      if ((elig.sms_eligible && smsEligibleTier) || emailOnlyFallback) {
        preparedIds.push(promoted.id);
      }
      perProspect.push({
        id: promoted.id,
        business_name: promoted.business_name,
        outcome: "verified",
        tier: elig.sms_eligibility_tier,
        channel_planned: smsEligibleTier ? "sms" : (emailOnlyFallback ? "email" : "none"),
      });
    }

    // ------------------------------------------------------------------
    // Auto-send — scoped to prospect_ids prepared in THIS run only
    // ------------------------------------------------------------------
    let smsResult: any = null;
    if (preparedIds.length > 0) {
      for (const pid of preparedIds) {
        await emitEvent(supabase, ctx, { prospect_id: pid, stage: "sms_attempted", metadata: {} });
      }
      const r = await fetch(`${url}/functions/v1/send-verified-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ dry_run: false, limit: preparedIds.length, prospect_ids: preparedIds, run_id: ctx.run_id }),
      });
      smsResult = await r.json().catch(() => ({}));

      if (smsResult?.results) {
        for (const rr of smsResult.results) {
          if (rr.status === "sent") {
            await supabase
              .from("acquisition_queue")
              .update({ state: "contacted", attempt_count: 1, updated_at: new Date().toISOString() })
              .eq("prospect_id", rr.id);
            await emitEvent(supabase, ctx, {
              prospect_id: rr.id,
              stage: "sms_sent",
              metadata: { sid: rr.sid ?? null, to_masked: rr.to ? String(rr.to).replace(/(\+\d{4})\d+(\d{2})/, "$1***$2") : null },
            });
          } else if (rr.status === "failed") {
            await supabase
              .from("acquisition_queue")
              .update({ state: "failed", last_error: String(rr.error ?? "").slice(0, 500), updated_at: new Date().toISOString() })
              .eq("prospect_id", rr.id);
            await emitEvent(supabase, ctx, {
              prospect_id: rr.id,
              stage: "failed",
              reason_code: "sms_send_failed",
              reason_text: String(rr.error ?? "").slice(0, 300),
              metadata: {},
            });
          } else if (rr.skipped || rr.skipped_by_gate) {
            await emitEvent(supabase, ctx, {
              prospect_id: rr.id,
              stage: "excluded_history",
              reason_code: String(rr.skipped ?? rr.skipped_by_gate ?? "gate_blocked"),
              metadata: {},
            });
          }
        }
      }
    }

    // Worker cycle summary
    await emitEvent(supabase, ctx, {
      stage: "worker_cycle",
      metadata: {
        counts,
        prepared_count: preparedIds.length,
        sms_result_summary: smsResult ? { sent: smsResult.sent ?? 0, processed: smsResult.processed ?? 0 } : null,
        repair,
      },
    });

    return jsonResponse({
      ok: true,
      run_id: ctx.run_id,
      mode: ctx.mode,
      city: ctx.city,
      category: ctx.category,
      counts,
      prepared_prospect_ids: preparedIds,
      prospects: perProspect,
      sms_result: smsResult,
      repair,
    });
  } catch (e) {
    console.error(`${FUNCTION_NAME} failed`, e);
    return jsonResponse({ ok: false, message: (e as Error).message }, 500);
  }
});
