/**
 * Helper to wrap an agent execution with timing + logging into agent_runs.
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export async function recordAgentRun<T>(
  agentName: string,
  fn: (db: SupabaseClient) => Promise<T>,
  triggeredBy: string = "cron",
  input: Record<string, unknown> = {},
): Promise<{ ok: boolean; output?: T; error?: string; runId: string }> {
  const db = adminClient();
  const { data: run } = await db
    .from("agent_runs")
    .insert({ agent_name: agentName, status: "running", input, triggered_by: triggeredBy })
    .select("id, started_at")
    .single();

  const runId = run!.id as string;
  const t0 = Date.now();
  try {
    const output = await fn(db);
    await db.from("agent_runs").update({
      status: "ok",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - t0,
      output: output as Record<string, unknown>,
    }).eq("id", runId);
    return { ok: true, output, runId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("agent_runs").update({
      status: "error",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - t0,
      error: msg,
    }).eq("id", runId);
    return { ok: false, error: msg, runId };
  }
}

export async function checkAndConsumeQuota(
  db: SupabaseClient,
  channel: "sms" | "email" | "activation" | "scrape",
  scope: "global" | "trade" | "city" | "trade_city" | "phone",
  scopeKey: string,
  defaultLimit: number,
): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await db
    .from("activation_quotas")
    .select("id, used_count, limit_count")
    .eq("scope", scope).eq("scope_key", scopeKey).eq("channel", channel).eq("period_date", today)
    .maybeSingle();

  if (!existing) {
    await db.from("activation_quotas").insert({
      scope, scope_key: scopeKey, channel, period_date: today,
      limit_count: defaultLimit, used_count: 1, last_used_at: new Date().toISOString(),
    });
    return true;
  }
  if (existing.used_count >= existing.limit_count) return false;
  await db.from("activation_quotas")
    .update({ used_count: existing.used_count + 1, last_used_at: new Date().toISOString() })
    .eq("id", existing.id);
  return true;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
