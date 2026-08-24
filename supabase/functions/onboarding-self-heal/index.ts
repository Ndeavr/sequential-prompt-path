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
 * `affiliate_assignments`. Real schema:
 *   prospect_id  -> contractors_prospects(id)  NOT NULL
 *   affiliate_id -> affiliates(id)             NOT NULL
 *   status text default 'to_call', priority int default 0
 *   UNIQUE (affiliate_id, prospect_id)
 * Every escalation therefore failed silently. We now resolve the real
 * prospect row, pick a real affiliate, and assign idempotently.
 */
function digitsOnly(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "").slice(-10);
}

async function resolveProspectId(contractorId: string): Promise<string | null> {
  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, company_name, phone")
    .eq("id", contractorId)
    .maybeSingle();
  const c = contractor as { company_name?: string; phone?: string } | null;
  if (!c) return null;

  const phone = digitsOnly(c.phone);
  if (phone.length === 10) {
    const { data } = await supabase
      .from("contractors_prospects")
      .select("id, phone")
      .ilike("phone", `%${phone}%`)
      .limit(1);
    const hit = (data ?? [])[0] as { id?: string } | undefined;
    if (hit?.id) return hit.id;
  }

  if (c.company_name) {
    const { data } = await supabase
      .from("contractors_prospects")
      .select("id")
      .ilike("business_name", c.company_name.trim())
      .limit(1);
    const hit = (data ?? [])[0] as { id?: string } | undefined;
    if (hit?.id) return hit.id;
  }
  return null;
}

/** Least-loaded active affiliate. Returns null when there is none — we never invent one. */
async function pickAffiliate(prospectId: string): Promise<string | null> {
  const { data: prospect } = await supabase
    .from("contractors_prospects")
    .select("assigned_affiliate_id")
    .eq("id", prospectId)
    .maybeSingle();
  const preassigned = (prospect as { assigned_affiliate_id?: string } | null)?.assigned_affiliate_id;
  if (preassigned) return preassigned;

  const { data: affiliates } = await supabase
    .from("affiliates")
    .select("id")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(50);
  const list = (affiliates ?? []) as { id: string }[];
  if (!list.length) return null;

  const loads = await Promise.all(
    list.map(async (a) => {
      const { count } = await supabase
        .from("affiliate_assignments")
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", a.id)
        .not("status", "in", "(won,lost)");
      return { id: a.id, load: count ?? 0 };
    }),
  );
  loads.sort((x, y) => x.load - y.load || x.id.localeCompare(y.id));
  return loads[0].id;
}

async function scheduleAffiliateHandoff(contractorId: string, currentState: string) {
  const prospectId = await resolveProspectId(contractorId);
  if (!prospectId) {
    console.warn("[self-heal] no prospect resolved for contractor", contractorId, "— handoff skipped");
    return false;
  }

  // Idempotent guard: never duplicate an OPEN assignment for the same prospect.
  const { data: open } = await supabase
    .from("affiliate_assignments")
    .select("id")
    .eq("prospect_id", prospectId)
    .not("status", "in", "(won,lost)")
    .limit(1);
  if ((open ?? []).length) return false;

  const affiliateId = await pickAffiliate(prospectId);
  if (!affiliateId) {
    console.warn("[self-heal] no active affiliate available — handoff skipped", { contractorId });
    return false;
  }

  // UNIQUE (affiliate_id, prospect_id) makes this upsert safe to replay.
  const { error } = await supabase.from("affiliate_assignments").upsert(
    {
      prospect_id: prospectId,
      affiliate_id: affiliateId,
      status: "to_call",
      priority: 1,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "affiliate_id,prospect_id", ignoreDuplicates: true },
  );
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

  let healed = 0, escalated = 0, handedOff = 0;
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
      if (await scheduleAffiliateHandoff(row.contractor_id, row.state)) handedOff++;
      escalated++;
    }
  }

  return new Response(JSON.stringify({ ok: true, healed, escalated, affiliate_handoffs: handedOff }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
