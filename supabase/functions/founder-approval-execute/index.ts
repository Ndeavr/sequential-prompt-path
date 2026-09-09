/**
 * UNPRO — Founder approval decision + automatic execution.
 *
 * The founder only ever says Approve / Reject / Modify.
 * Once approved, provisioning/configuration is automated here.
 * Nothing is executed for a rejected card; every decision is auditable.
 *
 * No provider (Twilio/Resend/Stripe) is ever called from this function.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

type Decision = "approve" | "reject" | "modify";

interface Body {
  approval_id?: string;
  decision?: Decision;
  /** Only for `modify`: replaces proposed_change and bumps the version. */
  modified_change?: Record<string, unknown>;
  note?: string;
}

/** Automated provisioning per approval kind. Returns a real result, never a claim. */
async function executeApproval(sb: any, approval: any): Promise<{ ok: boolean; result: Record<string, unknown> }> {
  const change = approval.proposed_change ?? {};

  switch (approval.kind) {
    case "new_agent": {
      // Provision the agent as registered but INACTIVE-safe: the DB trigger now
      // finds an approved card, so activation is legitimate and attributable.
      const { error } = await sb.from("agent_registry").upsert({
        agent_key: approval.target_key,
        agent_name: change.agent_name ?? approval.title,
        layer: change.layer ?? "operational",
        domain: change.domain ?? "growth",
        mission: change.mission ?? approval.reason ?? null,
        actions: change.actions ?? [],
        triggers: change.triggers ?? [],
        config: change.config ?? {},
        autonomy_level: change.autonomy_level ?? "supervised",
        status: "active",
        created_by: "founder-approval",
      }, { onConflict: "agent_key" });
      if (error) return { ok: false, result: { error: error.message } };
      return { ok: true, result: { provisioned_agent: approval.target_key } };
    }

    case "message":
    case "offer":
    case "funnel_behavior":
    case "pricing":
    case "strategy":
    case "other":
    default: {
      // Generic path: record the approved configuration so the owning worker
      // picks it up on its next cycle. No silent side effects here.
      const { error } = await sb.from("agent_memory").insert({
        agent_key: approval.proposed_by_agent ?? "founder",
        memory_key: `approved:${approval.kind}:${approval.target_key ?? approval.id}`,
        memory_type: `approved_${approval.kind}`,
        domain: "governance",
        content: JSON.stringify({
          approval_id: approval.id,
          target_key: approval.target_key,
          change,
          version: approval.version,
        }),
        metadata: { approval_id: approval.id, version: approval.version },
        importance: 5,
      });
      if (error) return { ok: false, result: { error: error.message } };
      return { ok: true, result: { applied: "configuration_recorded", target_key: approval.target_key } };
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!body.approval_id || !body.decision || !["approve", "reject", "modify"].includes(body.decision)) {
    return json({ error: "approval_id and decision (approve|reject|modify) are required" }, 400);
  }

  // Caller must be an authenticated admin.
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return json({ error: "unauthorized" }, 401);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) return json({ error: "forbidden" }, 403);

  const { data: approval } = await sb
    .from("founder_approvals")
    .select("*")
    .eq("id", body.approval_id)
    .maybeSingle();

  if (!approval) return json({ error: "not_found" }, 404);
  if (!["pending", "modified"].includes(approval.status)) {
    // Idempotent: a decided card is never re-executed.
    return json({ ok: true, already: approval.status, id: approval.id });
  }

  const now = new Date().toISOString();

  if (body.decision === "reject") {
    await sb.from("founder_approvals").update({
      status: "rejected", decided_by: userId, decided_at: now,
      execution_result: { note: body.note ?? null },
    }).eq("id", approval.id);
    return json({ ok: true, status: "rejected" });
  }

  if (body.decision === "modify") {
    await sb.from("founder_approvals").update({
      status: "modified",
      proposed_change: body.modified_change ?? approval.proposed_change,
      version: (approval.version ?? 1) + 1,
      decided_by: userId, decided_at: now,
      execution_result: { note: body.note ?? null },
    }).eq("id", approval.id);
    return json({ ok: true, status: "modified" });
  }

  // approve → mark approved first (so the agent trigger can see it), then execute.
  await sb.from("founder_approvals").update({
    status: "approved", decided_by: userId, decided_at: now,
  }).eq("id", approval.id);

  const exec = await executeApproval(sb, { ...approval, status: "approved" });

  await sb.from("founder_approvals").update({
    status: exec.ok ? "executed" : "failed",
    execution_result: exec.result,
    executed_at: new Date().toISOString(),
  }).eq("id", approval.id);

  await reportOutcome({
    operation: "founder.approval.execute",
    intent: `Exécuter l'approbation ${approval.kind}: ${approval.title}`,
    outcome: exec.ok ? "achieved" : "failed",
    failure_code: exec.ok ? null : FailureCode.UNKNOWN,
    affected_record: approval.id,
    service: "founder-approval-execute",
    next_action: exec.ok ? "Mesurer l'impact au prochain cycle" : "Corriger puis réessayer",
    payload: exec.result,
  });

  return json({ ok: exec.ok, status: exec.ok ? "executed" : "failed", result: exec.result });
});
