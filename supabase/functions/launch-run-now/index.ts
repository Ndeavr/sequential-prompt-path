/**
 * launch-run-now — emergency admin trigger.
 * Synchronously executes the full pipeline:
 *   enrich-contact → scout → enrich → visibility → outreach → delivery-monitor
 *   → reply-detector → sales-closer → payment-monitor
 *
 * Returns a structured report so the operator sees exactly what happened.
 * Admin-auth required.
 */
import { corsHeaders, adminClient, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome } from "../_shared/reliability.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FN_URL = (name: string) => `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;
const SRK = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STEPS: Array<{ name: string; body: Record<string, unknown>; timeoutMs: number }> = [
  { name: "launch-agent-enrich-contact", body: { batch: 20 }, timeoutMs: 60_000 },
  { name: "launch-agent-scout",           body: { batch: 25 }, timeoutMs: 45_000 },
  { name: "launch-agent-enrich",          body: { batch: 20 }, timeoutMs: 45_000 },
  { name: "launch-agent-visibility",      body: { batch: 20 }, timeoutMs: 60_000 },
  { name: "launch-agent-outreach",        body: { batch: 30 }, timeoutMs: 60_000 },
  { name: "launch-agent-delivery-monitor",body: {},            timeoutMs: 20_000 },
  { name: "launch-agent-reply-detector",  body: {},            timeoutMs: 20_000 },
  { name: "launch-agent-sales-closer",    body: { batch: 10 }, timeoutMs: 30_000 },
  { name: "launch-agent-payment-monitor", body: {},            timeoutMs: 20_000 },
];

async function invokeWithTimeout(name: string, body: Record<string, unknown>, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const r = await fetch(FN_URL(name), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SRK()}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await r.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { /* keep raw */ }
    return {
      name,
      ok: r.ok,
      status: r.status,
      duration_ms: Date.now() - started,
      response: parsed ?? text.slice(0, 400),
    };
  } catch (e) {
    return {
      name, ok: false, status: 0,
      duration_ms: Date.now() - started,
      response: { error: String(e), aborted: ctrl.signal.aborted },
    };
  } finally {
    clearTimeout(t);
  }
}

async function requireAdmin(req: Request): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, reason: "missing_auth" };
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, reason: "invalid_token" };
  const admin = adminClient();
  const { data: role } = await admin
    .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!role) return { ok: false, reason: "not_admin" };
  return { ok: true, userId: user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return new Response(JSON.stringify({ ok: false, reason: gate.reason }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await logLaunchEvent({
    agent: "launch-run-now",
    event: "manual_trigger",
    success: true,
    message: `Run-now déclenché par admin ${gate.userId.slice(0, 8)}`,
  });

  const ran: typeof STEPS[number] extends infer S ? Array<Awaited<ReturnType<typeof invokeWithTimeout>>> : never =
    [] as any;

  const sb = adminClient();
  const before = await sb.from("launch_leads").select("lead_status");
  const beforeCounts: Record<string, number> = {};
  for (const r of before.data ?? []) beforeCounts[(r as any).lead_status] = (beforeCounts[(r as any).lead_status] ?? 0) + 1;

  for (const step of STEPS) {
    const result = await invokeWithTimeout(step.name, step.body, step.timeoutMs);
    (ran as any[]).push(result);
  }

  const after = await sb.from("launch_leads").select("lead_status");
  const afterCounts: Record<string, number> = {};
  for (const r of after.data ?? []) afterCounts[(r as any).lead_status] = (afterCounts[(r as any).lead_status] ?? 0) + 1;

  const delta: Record<string, number> = {};
  for (const k of new Set([...Object.keys(beforeCounts), ...Object.keys(afterCounts)])) {
    const d = (afterCounts[k] ?? 0) - (beforeCounts[k] ?? 0);
    if (d !== 0) delta[k] = d;
  }

  const failed = (ran as any[]).filter((s) => !s.ok).map((s) => ({ name: s.name, status: s.status, response: s.response }));
  const succeeded = (ran as any[]).filter((s) => s.ok).map((s) => s.name);

  const report = {
    ok: failed.length === 0,
    triggered_by: gate.userId,
    triggered_at: new Date().toISOString(),
    steps_ran: (ran as any[]).map((s) => ({ name: s.name, ok: s.ok, status: s.status, duration_ms: s.duration_ms })),
    failed,
    succeeded,
    lead_counts_before: beforeCounts,
    lead_counts_after: afterCounts,
    delta,
    total_leads_added: Math.max(0, (after.data?.length ?? 0) - (before.data?.length ?? 0)),
  };

  await logLaunchEvent({
    agent: "launch-run-now",
    event: "manual_run_complete",
    success: failed.length === 0 && (after.data?.length ?? 0) > (before.data?.length ?? 0),
    message: `${succeeded.length} agents OK, ${failed.length} en échec. Leads: ${before.data?.length ?? 0} → ${after.data?.length ?? 0}`,
    payload: report as any,
  });

  await reportOutcome({
    operation: "launch.run_now",
    outcome: failed.length === 0 ? "achieved" : "partial",
    payload: report,
    next_action: failed.length > 0 ? `${failed.length} agent(s) en échec — voir Truth Panel` : undefined,
  });

  return new Response(JSON.stringify(report), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
