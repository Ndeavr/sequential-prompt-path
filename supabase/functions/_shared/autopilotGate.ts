// Autopilot gate — blocks outbound dispatch unless latest acq-e2e-selftest passed within 24h.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type GateState = {
  allowed: boolean;
  gated: boolean;
  reason: string | null;
  last_pass_at: string | null;
};

export async function checkAutopilotGate(supabase?: SupabaseClient): Promise<GateState> {
  const sb = supabase ?? createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data, error } = await sb
    .from("outreach_autopilot_gate")
    .select("gated,last_pass_at,reason")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) {
    return { allowed: false, gated: true, reason: "gate_row_missing", last_pass_at: null };
  }
  const lastPass = data.last_pass_at ? new Date(data.last_pass_at as string).getTime() : 0;
  const fresh = lastPass > Date.now() - 24 * 60 * 60 * 1000;
  const allowed = !data.gated && fresh;
  return {
    allowed,
    gated: !!data.gated,
    reason: allowed ? null : (data.reason ?? (fresh ? "manually_gated" : "selftest_stale_or_missing")),
    last_pass_at: (data.last_pass_at as string) ?? null,
  };
}

/** Throws if the gate is closed. Use at the top of any sender. */
export async function assertAutopilotOpen(supabase?: SupabaseClient): Promise<void> {
  const g = await checkAutopilotGate(supabase);
  if (!g.allowed) {
    throw new Error(`AUTOPILOT_GATED: ${g.reason ?? "blocked"}`);
  }
}
