/**
 * recruitment-orchestrator
 *
 * DECIDE + ENQUEUE ONLY. This function never calls Twilio, Resend, Stripe or
 * any provider directly. It selects city × category opportunities from real
 * demand data and delegates every execution stage to the existing canonical
 * owners:
 *
 *   selection / promotion / verification / queueing / sending
 *     -> acquisition-queue-worker  (which itself owns send-verified-batch)
 *
 * Safety layer (implemented here, not duplicated elsewhere):
 *   - global + per-channel kill switches (public.recruitment_controls)
 *   - orchestration lease per city × category × channel
 *     (public.claim_recruitment_lock, FOR UPDATE based, TTL bound)
 *   - run registry + per-item traceability
 *     (public.recruitment_runs / public.recruitment_run_items)
 *   - idempotency keys: recruitment:{city}:{category}:{prospect|campaign}:{type}:{YYYY-MM-DD}
 *   - daily limits: global, per city/category, per channel
 *   - conflict detection against existing automations already owning a candidate
 *
 * Modes: dry_run | enqueue | execute_controlled_test
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FUNCTION_NAME = "recruitment-orchestrator";
const TZ = "America/Toronto";

function torontoDay(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}
function torontoStamp(d = new Date()): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(d);
}
function slug(v: string | null | undefined): string {
  return String(v ?? "any").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
function json(body: Record<string, unknown>, status = 200) {
  const request_id = crypto.randomUUID();
  return new Response(JSON.stringify({ function: FUNCTION_NAME, request_id, generated_at: torontoStamp(), ...body }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": request_id },
  });
}
function rawError(e: unknown): string {
  if (!e) return "no error payload returned by provider";
  if (typeof e === "string") return e.slice(0, 500);
  const anyE = e as any;
  return String(anyE?.message ?? anyE?.error ?? JSON.stringify(anyE)).slice(0, 500);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, serviceKey);

  let runId: string | null = null;
  let lockKey: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const mode: string = ["dry_run", "enqueue", "execute_controlled_test"].includes(body.mode)
      ? body.mode : "dry_run";
    const province: string = String(body.province ?? "QC");
    const city: string | null = body.city ? String(body.city) : null;
    const category: string | null = body.category ? String(body.category) : null;
    const source: string = ["autonomous", "admin", "affiliate"].includes(body.source) ? body.source : "admin";
    const requested_by: string = String(body.requested_by ?? "admin");
    const channel: string = String(body.channel ?? "sms");
    const limit = Math.max(1, Math.min(Number(body.limit ?? 5), 25));

    // ---------------------------------------------------------------
    // 0. Controls / kill switches
    // ---------------------------------------------------------------
    const { data: controls, error: ctrlErr } = await supabase
      .from("recruitment_controls").select("*").limit(1).maybeSingle();
    if (ctrlErr) return json({ ok: false, stage: "controls", error: rawError(ctrlErr) }, 500);
    const c = controls ?? {};

    const isLive = mode === "execute_controlled_test";
    if (isLive && !c.global_enabled) {
      return json({ ok: false, blocked: true, reason_code: "kill_switch_global_off",
        reason_text: "Le recrutement autonome est désactivé (global_enabled = false).", mode });
    }
    if (mode === "enqueue" && !c.autonomous_enqueue_enabled) {
      return json({ ok: false, blocked: true, reason_code: "kill_switch_enqueue_off",
        reason_text: "L'enqueue autonome est désactivé (autonomous_enqueue_enabled = false).", mode });
    }
    if (isLive && channel === "sms" && !c.sms_enabled) {
      return json({ ok: false, blocked: true, reason_code: "kill_switch_sms_off",
        reason_text: "Le canal SMS est désactivé.", mode });
    }
    if (isLive && channel === "email" && !c.email_enabled) {
      return json({ ok: false, blocked: true, reason_code: "kill_switch_email_off",
        reason_text: "Le canal email est désactivé.", mode });
    }

    // Existing global kill switch owned by the platform (do not duplicate it).
    const { data: env } = await supabase
      .from("system_environment_state").select("kill_switch_active, mode").limit(1).maybeSingle();
    if (isLive && env?.kill_switch_active) {
      return json({ ok: false, blocked: true, reason_code: "platform_kill_switch_active",
        reason_text: "Le kill switch plateforme (system_environment_state) est actif." });
    }

    // ---------------------------------------------------------------
    // 1. Coverage gap ranking (real data only)
    // ---------------------------------------------------------------
    let gapQuery = supabase
      .from("v_recruitment_coverage_gaps")
      .select("city, category, homeowner_count, supply_count, gap_score, estimated_revenue, avg_urgency, opportunity_score, score_reasons")
      .order("opportunity_score", { ascending: false })
      .limit(20);
    if (city) gapQuery = gapQuery.ilike("city", city);
    if (category) gapQuery = gapQuery.ilike("category", `%${category}%`);
    const { data: gaps, error: gapErr } = await gapQuery;
    if (gapErr) return json({ ok: false, stage: "coverage_gaps", error: rawError(gapErr) }, 500);

    const targetCity = city ?? gaps?.[0]?.city ?? null;
    const targetCategory = category ?? gaps?.[0]?.category ?? null;
    if (!targetCity || !targetCategory) {
      return json({ ok: false, blocked: true, reason_code: "no_coverage_target",
        reason_text: "Aucune combinaison ville × catégorie exploitable dans les données de demande réelles.",
        recommendations: gaps ?? [] });
    }

    const day = torontoDay();
    const campaignType = mode === "execute_controlled_test" ? "controlled_live" : mode;
    const runIdemKey = `recruitment:${slug(targetCity)}:${slug(targetCategory)}:campaign:${campaignType}:${day}:${channel}`;
    lockKey = `recruitment:${slug(targetCity)}:${slug(targetCategory)}:${channel}`;

    // ---------------------------------------------------------------
    // 2. Daily limits (real counts from the run registry)
    // ---------------------------------------------------------------
    const dayStart = new Date(`${day}T00:00:00-04:00`).toISOString();
    const { data: todayRuns } = await supabase
      .from("recruitment_runs")
      .select("city, category, channel, sent_count, queued_count")
      .gte("started_at", dayStart);
    const sentGlobal = (todayRuns ?? []).reduce((s, r: any) => s + (r.sent_count ?? 0), 0);
    const sentCityCat = (todayRuns ?? [])
      .filter((r: any) => slug(r.city) === slug(targetCity) && slug(r.category) === slug(targetCategory))
      .reduce((s: number, r: any) => s + (r.sent_count ?? 0), 0);
    const sentChannel = (todayRuns ?? [])
      .filter((r: any) => r.channel === channel)
      .reduce((s: number, r: any) => s + (r.sent_count ?? 0), 0);

    const limits = {
      global: { used: sentGlobal, max: c.max_daily_global ?? 25 },
      city_category: { used: sentCityCat, max: c.max_daily_per_city_category ?? 10 },
      channel: { used: sentChannel, max: c.max_daily_per_channel ?? 25 },
    };
    if (isLive) {
      const breach = Object.entries(limits).find(([, v]) => v.used >= v.max);
      if (breach) {
        return json({ ok: false, blocked: true, reason_code: `daily_limit_${breach[0]}`,
          reason_text: `Limite quotidienne atteinte (${breach[0]}: ${breach[1].used}/${breach[1].max}).`, limits });
      }
    }

    // ---------------------------------------------------------------
    // 3. Idempotency — same request, same Toronto day = no new work
    // ---------------------------------------------------------------
    const { data: priorRun } = await supabase
      .from("recruitment_runs").select("*").eq("idempotency_key", runIdemKey).maybeSingle();
    if (priorRun && mode !== "dry_run") {
      return json({
        ok: true, idempotent_skip: true, already_processed: true,
        reason_code: "already_processed",
        reason_text: `Un run identique existe déjà aujourd'hui (${runIdemKey}).`,
        run_id: priorRun.run_id, previous_run: priorRun, new_sends: 0, limits,
      });
    }

    // ---------------------------------------------------------------
    // 4. Run registry entry
    // ---------------------------------------------------------------
    runId = crypto.randomUUID();
    const { error: runErr } = await supabase.from("recruitment_runs").insert({
      run_id: runId, mode, city: targetCity, category: targetCategory, channel,
      requested_limit: limit, status: "running", lock_key: lockKey,
      idempotency_key: mode === "dry_run" ? `${runIdemKey}:${runId}` : runIdemKey,
      source, requested_by, delegated_function: "acquisition-queue-worker",
      result: { province, opportunity: gaps?.[0] ?? null, limits },
    });
    if (runErr) {
      return json({ ok: false, stage: "run_registry", error: rawError(runErr) }, 500);
    }

    // ---------------------------------------------------------------
    // 5. Orchestration lease (skipped in dry_run: read-only, no work created)
    // ---------------------------------------------------------------
    let lock: any = { acquired: true, dry_run_skipped: true };
    if (mode !== "dry_run") {
      const { data: lockRes, error: lockErr } = await supabase.rpc("claim_recruitment_lock", {
        p_lock_key: lockKey, p_run_id: runId, p_owner_label: `${FUNCTION_NAME}:${source}`,
        p_ttl_seconds: c.lock_ttl_seconds ?? 900,
      });
      if (lockErr) {
        await supabase.from("recruitment_runs").update({
          status: "failed", error_summary: rawError(lockErr), completed_at: new Date().toISOString(),
        }).eq("run_id", runId);
        return json({ ok: false, stage: "lock", error: rawError(lockErr) }, 500);
      }
      lock = lockRes;
      if (!lock?.acquired) {
        await supabase.from("recruitment_runs").update({
          status: "skipped_locked", error_summary: "lock held by another orchestrator",
          completed_at: new Date().toISOString(),
        }).eq("run_id", runId);
        return json({ ok: false, blocked: true, reason_code: "lock_held",
          reason_text: `Un autre orchestrateur détient ${lockKey} jusqu'à ${lock?.expires_at}.`,
          lock, run_id: runId });
      }
    }

    // ---------------------------------------------------------------
    // 6. Conflict detection against existing automations
    // ---------------------------------------------------------------
    const cooldownDays = c.prospect_cooldown_days ?? 30;
    const cooldownIso = new Date(Date.now() - cooldownDays * 86400000).toISOString();
    const { count: pendingQueue } = await supabase
      .from("acquisition_queue").select("prospect_id", { count: "exact", head: true })
      .in("state", ["ready_sms", "ready_email", "sending"]);
    const { count: recentlyContacted } = await supabase
      .from("verified_contractor_prospects").select("id", { count: "exact", head: true })
      .ilike("city", targetCity).gte("outreach_sent_at", cooldownIso);
    const conflicts = {
      pending_queue_rows: pendingQueue ?? 0,
      recently_contacted_in_city: recentlyContacted ?? 0,
      cooldown_days: cooldownDays,
      known_owners: [
        "acquisition-queue-worker (cron */15) — sélection, promotion, vérification, enqueue",
        "send-verified-batch — envoi SMS + repli email",
        "launch-commander (cron * * * * *) — pipeline first-dollar",
        "acquisition-autopilot (cron */15) — relances",
      ],
    };

    // ---------------------------------------------------------------
    // 7. Delegate to the canonical worker (never send directly)
    // ---------------------------------------------------------------
    const delegatedDryRun = mode !== "execute_controlled_test";
    const workerBody = {
      dry_run: delegatedDryRun,
      run_id: runId,
      campaign: { city: targetCity, category: targetCategory, limit, dry_run: delegatedDryRun },
      limit,
    };
    const resp = await fetch(`${url}/functions/v1/acquisition-queue-worker`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify(workerBody),
    });
    const workerText = await resp.text();
    let worker: any = {};
    try { worker = JSON.parse(workerText); } catch { worker = { parse_error: workerText.slice(0, 500) }; }
    if (!resp.ok) {
      await supabase.from("recruitment_runs").update({
        status: "failed", error_summary: `acquisition-queue-worker [${resp.status}]: ${workerText.slice(0, 400)}`,
        completed_at: new Date().toISOString(), result: { worker },
      }).eq("run_id", runId);
      if (lockKey) await supabase.rpc("release_recruitment_lock", { p_lock_key: lockKey, p_run_id: runId });
      return json({ ok: false, stage: "delegation", status: resp.status,
        error: workerText.slice(0, 500), run_id: runId }, resp.status);
    }

    // ---------------------------------------------------------------
    // 8. Per-item traceability
    // ---------------------------------------------------------------
    const items: any[] = Array.isArray(worker.prospects) ? worker.prospects : [];
    const sendResults: any[] = Array.isArray(worker?.sms_result?.results) ? worker.sms_result.results : [];
    let queued = 0, sent = 0, skipped = 0, duplicate = 0, complianceBlocked = 0;

    for (const it of items) {
      const pid = it.id ?? it.existing_prospect_id ?? null;
      const sendRow = sendResults.find((r) => r.id === pid) ?? null;
      const itemIdem = `recruitment:${slug(targetCity)}:${slug(targetCategory)}:${pid ?? slug(it.business_name)}:${campaignType}:${day}`;
      let status = "eligible";
      let reason_code: string | null = null;
      let reason_text: string | null = null;

      if (it.historical_reason || it.bucket === "historically_excluded") {
        status = "skipped"; reason_code = it.historical_reason ?? "historically_excluded";
        reason_text = "Contact antérieur ou exclusion historique détectée par le worker canonique.";
        duplicate += 1; skipped += 1;
      } else if (it.bucket === "missing_or_invalid_phone") {
        status = "skipped"; reason_code = "missing_or_invalid_phone";
        reason_text = "Numéro absent ou non conforme."; skipped += 1;
      } else if (it.bucket === "quarantined" || it.outcome === "quarantined") {
        status = "compliance_blocked"; reason_code = "quarantined";
        reason_text = "Prospect en quarantaine (contactabilité/CASL)."; complianceBlocked += 1;
      } else if (sendRow?.status === "sent") {
        status = "sent"; sent += 1; queued += 1;
      } else if (sendRow?.status === "failed") {
        status = "failed"; reason_code = "send_failed";
        reason_text = rawError(sendRow.error); skipped += 1;
      } else if (sendRow?.skipped || sendRow?.skipped_by_gate) {
        status = "compliance_blocked";
        reason_code = String(sendRow.skipped ?? sendRow.skipped_by_gate);
        reason_text = "Bloqué par la porte de conformité de send-verified-batch.";
        complianceBlocked += 1;
      } else if (it.channel_planned && it.channel_planned !== "none") {
        status = "queued"; queued += 1;
      }

      await supabase.from("recruitment_run_items").insert({
        run_id: runId,
        prospect_id: pid && /^[0-9a-f-]{36}$/i.test(String(pid)) ? pid : null,
        business_name: it.business_name ?? null,
        city: targetCity, category: targetCategory,
        phone_e164: it.phone_e164_masked ?? null,
        channel: it.channel_planned ?? channel,
        stage: mode === "dry_run" ? "preview" : "delegated",
        status, reason_code, reason_text,
        idempotency_key: mode === "dry_run" ? `${itemIdem}:${runId}` : itemIdem,
        lock_key: lockKey,
        existing_queue_id: pid ?? null,
        provider_id: sendRow?.sid ?? null,
        edge_function: "acquisition-queue-worker",
      }).then(({ error }) => {
        if (error && !String(error.message ?? "").includes("duplicate key")) {
          console.error("run_item insert failed", error.message);
        }
      });
    }

    const counts = worker.counts ?? {};
    await supabase.from("recruitment_runs").update({
      status: "completed",
      claimed_count: items.length,
      eligible_count: counts.potentially_sms_eligible ?? items.filter((i) => i.channel_planned && i.channel_planned !== "none").length,
      queued_count: queued,
      sent_count: sent,
      skipped_count: skipped,
      duplicate_count: duplicate || (counts.historically_excluded ?? 0),
      compliance_blocked_count: complianceBlocked || (counts.quarantined ?? 0),
      delegated_run_id: worker.run_id ?? null,
      completed_at: new Date().toISOString(),
      result: { worker_counts: counts, limits, conflicts, opportunity: gaps?.[0] ?? null, lock },
    }).eq("run_id", runId);

    if (mode !== "dry_run" && lockKey) {
      await supabase.rpc("release_recruitment_lock", { p_lock_key: lockKey, p_run_id: runId });
    }

    return json({
      ok: true, mode, run_id: runId, city: targetCity, category: targetCategory, channel,
      lock_key: lockKey, lock, idempotency_key: runIdemKey,
      provider_calls_made: mode === "execute_controlled_test",
      delegated_to: "acquisition-queue-worker",
      recommendations: gaps ?? [],
      limits, conflicts,
      counts: {
        claimed: items.length, queued, sent, skipped,
        duplicate: duplicate || (counts.historically_excluded ?? 0),
        compliance_blocked: complianceBlocked || (counts.quarantined ?? 0),
      },
      worker_counts: counts,
      candidates: items,
      worker_sms_result: worker.sms_result ?? null,
    });
  } catch (e) {
    console.error(`${FUNCTION_NAME} failed`, e);
    if (runId) {
      await supabase.from("recruitment_runs").update({
        status: "failed", error_summary: rawError(e), completed_at: new Date().toISOString(),
      }).eq("run_id", runId);
      if (lockKey) await supabase.rpc("release_recruitment_lock", { p_lock_key: lockKey, p_run_id: runId });
    }
    return json({ ok: false, error: rawError(e) }, 500);
  }
});
