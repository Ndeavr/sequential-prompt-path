// Onboarding Self-Heal — recovers stuck contractors. Cron: 0 * * * *
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Thresholds per state (minutes stuck without progressing)
const STUCK_THRESHOLDS_MIN: Record<string, number> = {
  INVITED: 60 * 24 * 3,           // 3 days no landing
  LANDED: 60 * 24 * 2,            // 2 days no registration
  REGISTERING: 60 * 24,           // 24h abandoned form
  OTP_VERIFIED: 60 * 24,          // 24h no payment
  PAYMENT_COMPLETE: 60,           // 1h no activation
  PROFILE_ENRICHMENT: 60 * 6,     // 6h enrichment failed
  VERIFIED: 60 * 24,              // 24h no readiness eval
  CONTACTABLE: 60 * 6,            // invite retries stuck
};

/**
 * Escalate a stuck contractor to the human/affiliate recovery layer.
 *
 * REPAIR (2026-08-24): the previous version wrote `contractor_id`, a text
 * `priority` and a `reason` column — none of which exist on
 * `affiliate_assignments` (real columns: prospect_id, affiliate_id, status,
 * priority int, recommended_plan_slug, assigned_at, ...). Every escalation
 * therefore failed silently. We now resolve the canonical prospect for the
 * contractor and upsert idempotently on prospect_id.
 */
async function scheduleAffiliateHandoff(contractorId: string, currentState: string) {
  // Resolve the canonical prospect row for this contractor.
  const { data: prospect } = await supabase
    .from("verified_contractor_prospects")
    .select("id")
    .eq("contractor_id", contractorId)
    .maybeSingle();

  const prospectId = (prospect as { id?: string } | null)?.id;
  if (!prospectId) {
    console.warn("[self-heal] no prospect for contractor", contractorId, "- handoff skipped");
    return false;
  }

  // Idempotent: never duplicate an open assignment for the same prospect.
  const { data: existing } = await supabase
    .from("affiliate_assignments")
    .select("id, status")
    .eq("prospect_id", prospectId)
    .not("status", "in", '("won","lost")')
    .maybeSingle();
  if (existing) return false;

  const { error } = await supabase.from("affiliate_assignments").insert({
    prospect_id: prospectId,
    status: "pending_auto_assign",
    priority: 1,
    assigned_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[self-heal] affiliate handoff failed", error.message, { contractorId, currentState });
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const nowMs = Date.now();
  const { data: rows } = await supabase
    .from("contractor_onboarding_states")
    .select("contractor_id, state, updated_at, retry_count, stuck_since")
    .in("state", Object.keys(STUCK_THRESHOLDS_MIN).concat(["STUCK"]))
    .limit(500);

  let healed = 0, escalated = 0;
  for (const row of rows ?? []) {
    const threshold = STUCK_THRESHOLDS_MIN[row.state] ?? 60 * 24 * 7;
    const since = new Date(row.updated_at).getTime();
    if (nowMs - since < threshold * 60_000) continue;

    // Attempt recovery: mark stuck + retry once by nudging next_action_at
    const retry = (row.retry_count ?? 0) + 1;
    if (retry <= 3) {
      await supabase.from("contractor_onboarding_states").update({
        retry_count: retry,
        next_action_at: new Date(nowMs + 5 * 60_000).toISOString(),
      }).eq("contractor_id", row.contractor_id);
      await supabase.from("contractor_onboarding_events").insert({
        contractor_id: row.contractor_id,
        from_state: row.state,
        to_state: row.state,
        actor: "system",
        retry_count: retry,
        metadata: { self_heal: true },
      });
      healed++;
    } else {
      await supabase.from("contractor_onboarding_states").update({
        state: "STUCK",
        stuck_since: new Date().toISOString(),
        blocked_reason: `timeout_in_${row.state}`,
      }).eq("contractor_id", row.contractor_id);
      await supabase.from("contractor_onboarding_events").insert({
        contractor_id: row.contractor_id,
        from_state: row.state,
        to_state: "STUCK",
        actor: "system",
        error: `timeout_in_${row.state}`,
      });
      await scheduleAffiliateHandoff(row.contractor_id, row.state);
      escalated++;
    }
  }

  return new Response(JSON.stringify({ ok: true, healed, escalated }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
