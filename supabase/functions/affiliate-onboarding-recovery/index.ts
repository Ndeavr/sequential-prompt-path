/**
 * UNPRO — affiliate-onboarding-recovery
 * Routage interne d'onboardings incomplets prometteurs vers le Mode Action affilié.
 * N'envoie JAMAIS de SMS, courriel, push ou appel. Écrit uniquement :
 *   - contractor_leads.assigned_affiliate_id
 *   - affiliate_lead_events (onboarding_recovery_routed)
 *   - agent_learning_outcomes (rollup borné)
 * dry_run=true par défaut.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  RECOVERY_RULE_KEY,
  RECOVERY_EVENT_TYPE,
  RECOVERY_TACTIC_KEY,
  mergeConfig,
  evaluateCandidate,
  matchAffiliate,
  computeLearnedBoosts,
  normalizeCity,
  normalizeCategory,
  type LeadRow,
  type AffiliateRow,
  type LearningRollup,
} from "./logic.ts";

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

  // --- Autorisation : appel système (service role) ou administrateur authentifié
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  let actor = "system";
  if (token !== SERVICE_KEY) {
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
  const dryRun = (body.dry_run ?? url.searchParams.get("dry_run")) !== false &&
    String(body.dry_run ?? url.searchParams.get("dry_run") ?? "true") !== "false";

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

    // --- Leads onboarding démarré, non complété, non payé
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

    // --- Événements de reprise déjà enregistrés (idempotence)
    const events = (ok(
      await admin
        .from("affiliate_lead_events")
        .select("lead_id, affiliate_id, created_at")
        .eq("event_type", RECOVERY_EVENT_TYPE),
      "lecture affiliate_lead_events",
    ) ?? []) as Array<{ lead_id: string; affiliate_id: string; created_at: string }>;
    const routedLeadIds = new Set(events.map((e) => e.lead_id));

    // --- Affiliés
    const affiliates = (ok(
      await admin
        .from("affiliates")
        .select("id, first_name, last_name, name, status, suspended_at, archived_at, primary_city, territories, allowed_categories, daily_quota"),
      "lecture affiliates",
    ) ?? []) as AffiliateRow[];

    // --- Charge du jour : routages de reprise effectués aujourd'hui
    const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
    const workload: Record<string, number> = {};
    for (const e of events) {
      if (new Date(e.created_at).getTime() >= startOfDay.getTime()) {
        workload[e.affiliate_id] = (workload[e.affiliate_id] ?? 0) + 1;
      }
    }

    // --- Apprentissage borné à partir des résultats réels observés
    const routedLeadIdList = events.map((e) => e.lead_id);
    const rollups: Record<string, LearningRollup> = {};
    if (routedLeadIdList.length > 0) {
      const routedLeads = (ok(
        await admin
          .from("contractor_leads")
          .select("id, assigned_affiliate_id, profile_status, profile_active_at, paid_at, contact_status, last_contacted_at")
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
        const r = (rollups[e.affiliate_id] ??= { attempts: 0, delivered: 0, clicked: 0, signups: 0, activations: 0, conversions: 0 });
        r.attempts += 1;
        const ds = downstream.filter((d) => d.lead_id === e.lead_id);
        if (ds.some((d) => d.event_type === "prospect_viewed" || d.event_type === "personal_sms_opened")) r.delivered += 1;
        if (ds.some((d) => d.event_type === "call_initiated")) r.clicked += 1;
        const l = byLead.get(e.lead_id) as Record<string, unknown> | undefined;
        if (l?.profile_status === "complete") r.signups += 1;
        if (l?.profile_active_at) r.activations += 1;
        if (l?.paid_at) r.conversions += 1;
      }
    }
    const learning = computeLearnedBoosts(rollups, cfg);

    // --- Évaluation + appariement
    const results: Array<Record<string, unknown>> = [];
    let routed = 0, unassigned = 0, skipped = 0;

    for (const lead of leads) {
      const evaluation = evaluateCandidate(lead, cfg, now, { alreadyRoutedLeadIds: routedLeadIds });
      if (!evaluation.eligible) {
        skipped += 1;
        results.push({
          lead_id: lead.id, company_name: lead.company_name, status: "skipped",
          skip_reasons: evaluation.skip_reasons, inactivity_hours: evaluation.inactivity_hours,
        });
        continue;
      }
      const match = matchAffiliate(lead, cfg, affiliates, workload, learning.boosts);
      const base = {
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

      // Écriture conditionnelle : préserve toute propriété existante.
      const updated = ok(
        await admin
          .from("contractor_leads")
          .update({ assigned_affiliate_id: match.affiliate_id, updated_at: new Date().toISOString() })
          .eq("id", lead.id)
          .is("assigned_affiliate_id", null)
          .select("id"),
        "assignation lead",
      ) as Array<{ id: string }> | null;

      if (!updated || updated.length === 0) {
        skipped += 1;
        results.push({ ...base, status: "skipped", skip_reasons: ["ownership_changed"] });
        continue;
      }

      ok(
        await admin.from("affiliate_lead_events").insert({
          affiliate_id: match.affiliate_id,
          lead_id: lead.id,
          event_type: RECOVERY_EVENT_TYPE,
          channel: "internal_routing",
          payload: {
            rule_version: cfg.version,
            inactivity_hours: evaluation.inactivity_hours,
            evidence: evaluation.evidence,
            interesting_reasons: evaluation.interesting_reasons,
            match_reasons: match.reasons,
            previous_assigned_affiliate_id: null,
            learning_applied: learning.applied,
            actor,
          },
        }).select("id"),
        "journalisation événement de reprise",
      );

      workload[match.affiliate_id] = (workload[match.affiliate_id] ?? 0) + 1;
      routedLeadIds.add(lead.id);
      routed += 1;
      results.push({ ...base, status: "routed" });
    }

    // --- Rollup d'apprentissage (résultats réels uniquement)
    if (!dryRun && Object.keys(rollups).length > 0) {
      const windowStart = new Date(now - 90 * 86400000).toISOString();
      const windowEnd = new Date(now).toISOString();
      for (const [affiliateId, r] of Object.entries(rollups)) {
        const existing = ok(
          await admin
            .from("agent_learning_outcomes")
            .select("id")
            .eq("tactic_key", RECOVERY_TACTIC_KEY)
            .eq("variant", affiliateId)
            .limit(1),
          "lecture agent_learning_outcomes",
        ) as Array<{ id: string }> | null;
        const row = {
          tactic_key: RECOVERY_TACTIC_KEY,
          channel: "internal_routing",
          variant: affiliateId,
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
      },
      learning: {
        applied: learning.applied,
        sample: learning.sample,
        terminal_outcomes: learning.terminal,
        min_sample: cfg.learning.min_sample,
        max_boost: cfg.learning.max_boost,
      },
      totals: { inspected: leads.length, routed, unassigned, skipped },
      results,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "unknown_error" }, 500);
  }
});
