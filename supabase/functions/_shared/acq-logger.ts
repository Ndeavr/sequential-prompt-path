// Shared logger for acq-* edge functions
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export function svc(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export async function startRun(s: SupabaseClient, run_type: string, input_params: Record<string, unknown> = {}) {
  const { data } = await s.from("acquisition_pipeline_runs").insert({
    run_type, status: "running", input_params,
  }).select("id").single();
  return data?.id as string | undefined;
}

export async function finishRun(s: SupabaseClient, runId: string | undefined, patch: Record<string, unknown>) {
  if (!runId) return;
  await s.from("acquisition_pipeline_runs").update({
    completed_at: new Date().toISOString(),
    ...patch,
  }).eq("id", runId);
}

export async function log(
  s: SupabaseClient,
  runId: string | undefined,
  step: string,
  status: "info" | "success" | "warning" | "error" | "blocked" | "skipped",
  message?: string,
  prospect_id?: string | null,
  metadata: Record<string, unknown> = {},
) {
  await s.from("acquisition_pipeline_logs").insert({
    run_id: runId ?? null, prospect_id: prospect_id ?? null, step, status, message: message ?? null, metadata,
  });
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export async function requireService(s: SupabaseClient, service_name: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data } = await s.from("system_config_health").select("status,error_message").eq("service_name", service_name).maybeSingle();
  if (!data) return { ok: false, reason: `${service_name}: aucun health-check effectué` };
  if (data.status === "connected" || data.status === "limited") return { ok: true };
  return { ok: false, reason: `${service_name}: ${data.error_message || data.status}` };
}
