/**
 * UNPRO — affiliate-onboarding-recovery
 *
 * Routage INTERNE d'onboardings incomplets prometteurs vers les files
 * affiliées existantes. N'envoie JAMAIS de SMS, courriel, push ou appel et ne
 * déclenche aucune notification.
 *
 * Deux cohortes réelles, aucune table de prospects supplémentaire :
 *   A. `contractor_leads`  → Mode Action (`assigned_affiliate_id`) via le RPC
 *      atomique `route_onboarding_recovery`.
 *   B. prospects vérifiés du CRM (`v_manual_contact_queue`) → file manuelle
 *      `crm_manual_assignments` (+ `crm_action_log` idempotent).
 *
 * dry_run = true par défaut.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  RECOVERY_RULE_KEY,
  RECOVERY_EVENT_TYPE,
  RECOVERY_TACTIC_KEY,
  mergeConfig,
  evaluateCandidate,
  matchAffiliate,
  matchAffiliateFor,
  computeLearnedBoosts,
  normalizeCity,
  normalizeCategory,
  type LeadRow,
  type AffiliateRow,
  type LearningRollup,
} from "./logic.ts";
import {
  CRM_SOURCE,
  crmActionReason,
  crmIdempotencyKey,
  crmRoutingScore,
  evaluateCrmCandidate,
  type CrmQueueRow,
} from "./crm.ts";
import {
  computeContactPermissions,
  type SendEligibilityRow,
} from "../_shared/contactPermissions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function ok<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // --- Autorisation : appel système (service role), jeton de tâche, ou admin authentifié
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  const providedInternal = (req.headers.get("x-internal-token") ?? "").trim();
  let actor = "system";
  let internalOk = token === SERVICE_KEY;
  if (!internalOk && providedInternal) {
    const { data: jobToken } = await admin
      .from("internal_job_tokens")
      .select("token")
      .eq("job_key", "affiliate_onboarding_recovery")
      .maybeSingle();
    internalOk = !!jobToken?.token && jobToken.token === providedInternal;
    if (internalOk) actor = "cron";
  }
  if (!internalOk) {
    const { data: userData } = await admin.auth.getUser(token);
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin");
    if (!roles || roles.length === 0) return json({ error: "forbidden" }, 403);
    actor = uid;
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* GET/cron */ }
  const url = new URL(req.url);
  const rawDry = body.dry_run ?? url.searchParams.get("dry_run");
  const dryRun = rawDry !== false && String(rawDry ?? "true") !== "false";

  try {
    // --- Configuration (jamais codée en dur)
    const rule = ok(
      await admin.from("optimization_rules").select("rule_key, is_active, config_json").eq("rule_key", RECOVERY_RULE_KEY).maybeSingle(),
      "lecture optimization_rules",
    ) as { is_active: boolean; config_json: unknown } | null;

    if (!rule) return json({ error: "rule_missing", rule_key: RECOVERY_RULE_KEY }, 409);
    if (!rule.is_active) return json({ disabled: true, rule_key: RECOVERY_RULE_KEY, routed: 0, candidates: 0 });
    const cfg = mergeConfig(rule.config_json);

    const now = Date.now();

    // --- Affiliés (partagés par les deux cohortes)
    const affiliates = (ok(
      await admin
        .from("affiliates")
        .select("id, first_name, last_name, name, status, suspended_at, archived_at, primary_city, territories, allowed_categories, daily_quota"),
      "lecture affiliates",
    ) ?? []) as AffiliateRow[];

    // --- Événements de reprise déjà enregistrés (idempotence + charge)
    const events = (ok(
      await admin
        .from("affiliate_lead_events")
        .select("lead_id, affiliate_id, created_at")
        .eq("event_type", RECOVERY_EVENT_TYPE),
      "lecture affiliate_lead_events",
    ) ?? []) as Array<{ lead_id: string; affiliate_id: string; created_at: string }>;
    const routedLeadIds = new Set(events.map((e) => e.lead_id));

    const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
    const workload: Record<string, number> = {};
    for (const e of events) {
      if (new Date(e.created_at).getTime() >= startOfDay.getTime()) {
        workload[e.affiliate_id] = (workload[e.affiliate_id] ?? 0) + 1;
      }
    }
    // Les assignations manuelles du jour comptent dans la même charge affiliée.
    const todayAssignments = (ok(
      await admin
        .from("crm_manual_assignments")
        .select("affiliate_id, assigned_at, status")
        .gte("assigned_at", startOfDay.toISOString()),
      "lecture charge crm_manual_assignments",
    ) ?? []) as Array<{ affiliate_id: string | null }>;
    for (const a of todayAssignments) {
      if (a.affiliate_id) workload[a.affiliate_id] = (workload[a.affiliate_id] ?? 0) + 1;
    }

    // --- Apprentissage borné à partir des résultats réels observés
    const routedLeadIdList = events.map((e) => e.lead_id);
    const rollups: Record<string, LearningRollup> = {};
    const dimRollups: Record<string, LearningRollup & { affiliate_id: string; service_category: string | null; city: string | null }> = {};
    if (routedLeadIdList.length > 0) {
      const routedLeads = (ok(
        await admin
          .from("contractor_leads")
          .select("id, assigned_affiliate_id, profile_status, profile_active_at, paid_at, contact_status, city, category_primary, trade")
          .in("id", routedLeadIdList),
        "lecture leads routés",
      ) ?? []) as Array<Record<string, unknown>>;
      const byLead = new Map(routedLeads.map((l) => [String(l.id), l]));
      const downstream = (ok(
        await admin
          .from("affiliate_lead_events")
          .select("lead_id, affiliate_id, event_type")
          .in("lead_id", routedLeadIdList),
        "lecture événements aval",
      ) ?? []) as Array<{ lead_id: string; affiliate_id: string; event_type: string }>;

      for (const e of events) {
        const l = byLead.get(e.lead_id) as Record<string, unknown> | undefined;
        const category = normalizeCategory(String(l?.category_primary ?? l?.trade ?? "") || null, cfg) || null;
        const city = normalizeCity(String(l?.city ?? "") || null, cfg).normalized || null;
        const dimKey = `${e.affiliate_id}|${category ?? ""}|${city ?? ""}`;

        const r = (rollups[e.affiliate_id] ??= { attempts: 0, delivered: 0, clicked: 0, signups: 0, activations: 0, conversions: 0 });
        const d = (dimRollups[dimKey] ??= {
          attempts: 0, delivered: 0, clicked: 0, signups: 0, activations: 0, conversions: 0,
          affiliate_id: e.affiliate_id, service_category: category, city,
        });
        r.attempts += 1; d.attempts += 1;
        const ds = downstream.filter((x) => x.lead_id === e.lead_id);
        if (ds.some((x) => x.event_type === "prospect_viewed" || x.event_type === "personal_sms_opened")) { r.delivered += 1; d.delivered += 1; }
        if (ds.some((x) => x.event_type === "call_initiated")) { r.clicked += 1; d.clicked += 1; }
        if (l?.profile_status === "complete") { r.signups += 1; d.signups += 1; }
        if (l?.profile_active_at) { r.activations += 1; d.activations += 1; }
        if (l?.paid_at) { r.conversions += 1; d.conversions += 1; }
      }
    }
    // --- Apprentissage : cohorte CRM (résultats réels d'assignations de reprise)
    const crmAssignments = (ok(
      await admin
        .from("crm_manual_assignments")
        .select("prospect_id, affiliate_id, status, last_outcome, attempts")
        .eq("queue", "onboarding_recovery"),
      "lecture assignations de reprise",
    ) ?? []) as Array<{ prospect_id: string; affiliate_id: string | null; status: string | null; last_outcome: string | null; attempts: number | null }>;

    if (crmAssignments.length > 0) {
      const pids = crmAssignments.map((a) => a.prospect_id);
      const prospects = (ok(
        await admin
          .from("verified_contractor_prospects")
          .select("id, city, category")
          .in("id", pids),
        "lecture prospects assignés",
      ) ?? []) as Array<{ id: string; city: string | null; category: string | null }>;
      const byProspect = new Map(prospects.map((p) => [p.id, p]));

      for (const a of crmAssignments) {
        if (!a.affiliate_id) continue;
        const p = byProspect.get(a.prospect_id);
        const category = normalizeCategory(p?.category ?? null, cfg) || null;
        const city = normalizeCity(p?.city ?? null, cfg).normalized || null;
        const dimKey = `${a.affiliate_id}|${category ?? ""}|${city ?? ""}`;
        const r = (rollups[a.affiliate_id] ??= { attempts: 0, delivered: 0, clicked: 0, signups: 0, activations: 0, conversions: 0 });
        const d = (dimRollups[dimKey] ??= {
          attempts: 0, delivered: 0, clicked: 0, signups: 0, activations: 0, conversions: 0,
          affiliate_id: a.affiliate_id, service_category: category, city,
        });
        r.attempts += 1; d.attempts += 1;
        if ((a.attempts ?? 0) > 0) { r.clicked += 1; d.clicked += 1; }
        if (a.last_outcome === "interested") { r.signups += 1; d.signups += 1; }
        if (a.last_outcome === "activated") { r.activations += 1; d.activations += 1; }
        if (a.last_outcome === "paid") { r.conversions += 1; d.conversions += 1; }
      }
    }

    const learning = computeLearnedBoosts(rollups, cfg);

    // =====================================================================
    // COHORTE A — contractor_leads → Mode Action
    // =====================================================================
    const leads = (ok(
      await admin
        .from("contractor_leads")
        .select(
          "id, company_name, business_name, city, category_primary, trade, fit_score, priority_score, priority_level, profile_status, onboarding_started_at, payment_started_at, paid_at, profile_active_at, updated_at, archived_at, do_not_contact, unsubscribed_at, compliance_review_required, assigned_affiliate_id, created_by_affiliate_id, phone_e164, phone, email",
        )
        .not("onboarding_started_at", "is", null)
        .is("paid_at", null)
        .is("profile_active_at", null)
        .limit(cfg.max_candidates),
      "lecture contractor_leads",
    ) ?? []) as LeadRow[];

    const results: Array<Record<string, unknown>> = [];
    let routed = 0, unassigned = 0, skipped = 0;

    for (const lead of leads) {
      const evaluation = evaluateCandidate(lead, cfg, now, { alreadyRoutedLeadIds: routedLeadIds });
      if (!evaluation.eligible) {
        skipped += 1;
        results.push({
          cohort: "contractor_leads",
          lead_id: lead.id, company_name: lead.company_name, status: "skipped",
          skip_reasons: evaluation.skip_reasons, inactivity_hours: evaluation.inactivity_hours,
        });
        continue;
      }
      const match = matchAffiliate(lead, cfg, affiliates, workload, learning.boosts);
      const base = {
        cohort: "contractor_leads",
        lead_id: lead.id,
        company_name: lead.company_name ?? lead.business_name,
        city: lead.city,
        city_normalized: normalizeCity(lead.city, cfg).normalized,
        category: normalizeCategory(lead.category_primary ?? lead.trade, cfg),
        inactivity_hours: evaluation.inactivity_hours,
        interesting_reasons: evaluation.interesting_reasons,
        evidence: evaluation.evidence,
        match_reasons: match.reasons,
        rejected_affiliates: match.rejected,
        proposed_affiliate_id: match.affiliate_id,
        proposed_affiliate: match.affiliate_label,
      };

      if (!match.affiliate_id) {
        unassigned += 1;
        results.push({ ...base, status: "unassigned_admin_review" });
        continue;
      }
      if (dryRun) {
        results.push({ ...base, status: "would_route" });
        continue;
      }

      // Assignation + journalisation atomiques (verrou de ligne côté base).
      const rpc = ok(
        await admin.rpc("route_onboarding_recovery", {
          p_lead_id: lead.id,
          p_affiliate_id: match.affiliate_id,
          p_payload: {
            rule_version: cfg.version,
            inactivity_hours: evaluation.inactivity_hours,
            evidence: evaluation.evidence,
            interesting_reasons: evaluation.interesting_reasons,
            match_reasons: match.reasons,
            previous_assigned_affiliate_id: null,
            learning_applied: learning.applied,
            channel: "internal_routing",
            actor,
          },
        }),
        "routage atomique",
      ) as { status: string; affiliate_id?: string } | null;

      const status = rpc?.status ?? "unknown";
      if (status !== "routed") {
        skipped += 1;
        results.push({ ...base, status: "skipped", skip_reasons: [status] });
        continue;
      }

      workload[match.affiliate_id] = (workload[match.affiliate_id] ?? 0) + 1;
      routedLeadIds.add(lead.id);
      routed += 1;
      results.push({ ...base, status: "routed" });
    }

    // =====================================================================
    // COHORTE B — prospects vérifiés du CRM → file manuelle affiliée
    // =====================================================================
    const crmQueue = (ok(
      await admin
        .from("v_manual_contact_queue")
        .select("prospect_id, business_name, city, category, current_stage, priority_score, phone_e164, email, opted_out, assignment_id, affiliate_id, owner_user_id, assignment_status, last_activity_at, hours_since_last_activity, phone_validation_status")
        .limit(cfg.max_candidates),
      "lecture v_manual_contact_queue",
    ) ?? []) as CrmQueueRow[];

    const crmIds = crmQueue.map((r) => r.prospect_id);
    // Ponts existants vers contractor_leads (preuve LCAP canonique).
    const bridged = crmIds.length
      ? ((ok(
          await admin
            .from("contractor_leads")
            .select("id, source_prospect_id, do_not_contact, unsubscribed_at, compliance_review_required, compliance_review_reason")
            .in("source_prospect_id", crmIds),
          "lecture pont contractor_leads",
        ) ?? []) as Array<{ id: string; source_prospect_id: string; do_not_contact: boolean | null; unsubscribed_at: string | null; compliance_review_required: boolean | null; compliance_review_reason: string | null }>)
      : [];
    const bridgeByProspect = new Map(bridged.map((b) => [b.source_prospect_id, b]));
    const eligibility = bridged.length
      ? ((ok(
          await admin
            .from("v_commercial_send_eligibility")
            .select("contractor_lead_id, compliance_review_required, compliance_review_reason, valid_phone_evidence_count, valid_email_evidence_count, phone_suppressed, email_suppressed")
            .in("contractor_lead_id", bridged.map((b) => b.id)),
          "lecture v_commercial_send_eligibility",
        ) ?? []) as SendEligibilityRow[])
      : [];
    const eligByLead = new Map(eligibility.map((e) => [e.contractor_lead_id, e]));

    // Idempotence : reprises déjà journalisées pour cette version de règle.
    const priorActions = (ok(
      await admin
        .from("crm_action_log")
        .select("prospect_id, idempotency_key")
        .eq("source", CRM_SOURCE)
        .like("idempotency_key", "auto_recovery:%"),
      "lecture crm_action_log",
    ) ?? []) as Array<{ prospect_id: string | null; idempotency_key: string | null }>;
    const priorKeys = new Set(priorActions.map((a) => a.idempotency_key ?? ""));

    const crmResults: Array<Record<string, unknown>> = [];
    let crmRouted = 0, crmUnassigned = 0, crmSkipped = 0, crmFuture = 0;

    const scored = crmQueue
      .map((row) => ({ row, evaluation: evaluateCrmCandidate(row, cfg) }))
      .sort((a, b) =>
        (crmRoutingScore(b.row, cfg) - crmRoutingScore(a.row, cfg)) ||
        (Number(b.row.hours_since_last_activity ?? 0) - Number(a.row.hours_since_last_activity ?? 0)) ||
        a.row.prospect_id.localeCompare(b.row.prospect_id),
      );

    for (const { row, evaluation } of scored) {
      const stage = String(row.current_stage ?? "");
      const key = crmIdempotencyKey(row.prospect_id, stage, cfg.version);
      const bridge = bridgeByProspect.get(row.prospect_id) ?? null;
      const perms = computeContactPermissions({
        eligibility: bridge ? eligByLead.get(bridge.id) ?? null : null,
        has_phone: !!row.phone_e164,
        has_email: !!row.email,
        do_not_contact: row.opted_out === true || bridge?.do_not_contact === true,
        unsubscribed: !!bridge?.unsubscribed_at,
        phone_validation_status: row.phone_validation_status ?? null,
        compliance_review_required: bridge?.compliance_review_required ?? null,
        compliance_review_reason: bridge?.compliance_review_reason ?? null,
      });

      if (priorKeys.has(key)) {
        crmSkipped += 1;
        crmResults.push({ cohort: CRM_SOURCE, prospect_id: row.prospect_id, business_name: row.business_name, status: "skipped", skip_reasons: ["already_routed"] });
        continue;
      }
      if (!evaluation.eligible) {
        if (evaluation.future_eligible) crmFuture += 1; else crmSkipped += 1;
        crmResults.push({
          cohort: CRM_SOURCE, prospect_id: row.prospect_id, business_name: row.business_name,
          status: evaluation.future_eligible ? "future_eligible" : "skipped",
          skip_reasons: evaluation.skip_reasons, current_stage: stage,
        });
        continue;
      }

      const match = matchAffiliateFor(row.city, row.category, cfg, affiliates, workload, learning.boosts);
      const base = {
        cohort: CRM_SOURCE,
        prospect_id: row.prospect_id,
        business_name: row.business_name,
        city: row.city,
        current_stage: stage,
        priority_score: row.priority_score,
        hours_since_last_activity: row.hours_since_last_activity ?? null,
        interesting_reasons: evaluation.interesting_reasons,
        evidence: evaluation.evidence,
        match_reasons: match.reasons,
        rejected_affiliates: match.rejected,
        proposed_affiliate_id: match.affiliate_id,
        proposed_affiliate: match.affiliate_label,
        contact_permissions: perms,
      };

      if (!match.affiliate_id) {
        crmUnassigned += 1;
        crmResults.push({ ...base, status: "unassigned_admin_review" });
        continue;
      }
      if (dryRun) {
        crmResults.push({ ...base, status: "would_route" });
        continue;
      }

      // Assignation + journal d'audit en un seul appel verrouillé (RPC).
      const rpcCrm = ok(
        await admin.rpc("route_crm_recovery_assignment", {
          p_prospect_id: row.prospect_id,
          p_affiliate_id: match.affiliate_id,
          p_priority: Math.round(crmRoutingScore(row, cfg)),
          p_next_action: perms.can_call ? "Appeler" : "Vérifier la conformité avant tout contact",
          p_due_at: new Date(now + 24 * 3600 * 1000).toISOString(),
          p_idempotency_key: key,
          p_reason: crmActionReason(stage),
          p_payload: {
            rule_version: cfg.version,
            affiliate_id: match.affiliate_id,
            match_reasons: match.reasons,
            interesting_reasons: evaluation.interesting_reasons,
            evidence: evaluation.evidence,
            contact_permissions: perms,
            hours_since_last_activity: row.hours_since_last_activity ?? null,
            notification_sent: false,
            actor,
          },
        }),
        "routage CRM atomique",
      ) as { status: string; assignment_id?: string } | null;

      const crmStatus = rpcCrm?.status ?? "unknown";
      if (crmStatus !== "routed") {
        crmSkipped += 1;
        crmResults.push({ ...base, status: "skipped", skip_reasons: [crmStatus] });
        continue;
      }

      priorKeys.add(key);
      workload[match.affiliate_id] = (workload[match.affiliate_id] ?? 0) + 1;
      crmRouted += 1;
      crmResults.push({ ...base, status: "routed", assignment_id: rpcCrm?.assignment_id ?? null });
    }

    // --- Rollup d'apprentissage (résultats réels uniquement, dimensionné)
    if (!dryRun && Object.keys(dimRollups).length > 0) {
      const windowStart = new Date(now - 90 * 86400000).toISOString();
      const windowEnd = new Date(now).toISOString();
      for (const r of Object.values(dimRollups)) {
        const q = admin
          .from("agent_learning_outcomes")
          .select("id")
          .eq("tactic_key", RECOVERY_TACTIC_KEY)
          .eq("channel", "internal_routing")
          .eq("variant", r.affiliate_id)
          .eq("source", "affiliate-onboarding-recovery");
        const existing = ok(
          await (r.service_category ? q.eq("service_category", r.service_category) : q.is("service_category", null))
            .limit(1),
          "lecture agent_learning_outcomes",
        ) as Array<{ id: string }> | null;
        const row = {
          tactic_key: RECOVERY_TACTIC_KEY,
          channel: "internal_routing",
          variant: r.affiliate_id,
          service_category: r.service_category,
          city: r.city,
          source: "affiliate-onboarding-recovery",
          data_class: "verified",
          attempts: r.attempts,
          delivered: r.delivered,
          clicked: r.clicked,
          signups: r.signups,
          activations: r.activations,
          conversions: r.conversions,
          window_start: windowStart,
          window_end: windowEnd,
          computed_at: windowEnd,
        };
        if (existing && existing.length > 0) {
          ok(await admin.from("agent_learning_outcomes").update(row).eq("id", existing[0].id).select("id"), "maj agent_learning_outcomes");
        } else {
          ok(await admin.from("agent_learning_outcomes").insert(row).select("id"), "insertion agent_learning_outcomes");
        }
      }
    }

    return json({
      ok: true,
      dry_run: dryRun,
      rule_version: cfg.version,
      config: {
        inactivity_hours: cfg.inactivity_hours,
        fit_score_min: cfg.fit_score_min,
        priority_score_min: cfg.priority_score_min,
        crm_eligible_stages: cfg.crm_eligible_stages,
        crm_future_stages: cfg.crm_future_stages,
      },
      learning: {
        applied: learning.applied,
        sample: learning.sample,
        terminal_outcomes: learning.terminal,
        min_sample: cfg.learning.min_sample,
        max_boost: cfg.learning.max_boost,
      },
      totals: {
        inspected: leads.length,
        routed,
        unassigned,
        skipped,
        crm_inspected: crmQueue.length,
        crm_routed: crmRouted,
        crm_unassigned: crmUnassigned,
        crm_skipped: crmSkipped,
        crm_future_eligible: crmFuture,
      },
      results,
      crm_results: crmResults,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "unknown_error" }, 500);
  }
});
