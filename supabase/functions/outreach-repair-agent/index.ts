// Outreach Repair Agent — attempts deterministic, idempotent repairs.
// Called by outreach-health-agent. Logs to outreach_repair_runs (caller-side too).
// Real provider mutations are limited to what's safe without manual ops; most
// "manual_required" failures are surfaced for an admin to action.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

interface RepairRequest { provider: string; action: string; failure_reason?: string }

async function repairResendWebhook(): Promise<{ ok: boolean; detail: string }> {
  if (!RESEND_KEY) return { ok: false, detail: "RESEND_API_KEY missing" };
  const target = `${SUPABASE_URL}/functions/v1/resend-events`;
  try {
    // Idempotent: list, create if missing
    const list = await fetch("https://api.resend.com/webhooks", {
      headers: { Authorization: `Bearer ${RESEND_KEY}` },
    });
    if (!list.ok) return { ok: false, detail: `list HTTP ${list.status}` };
    const j = await list.json().catch(() => ({}));
    const hooks: Array<{ endpoint?: string }> = (j as any).data ?? [];
    if (hooks.some((h) => h.endpoint === target)) return { ok: true, detail: "webhook already present" };
    const create = await fetch("https://api.resend.com/webhooks", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: target, events: ["email.delivered","email.opened","email.clicked","email.bounced","email.complained"] }),
    });
    return { ok: create.ok, detail: `create HTTP ${create.status}` };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}

async function repairRedirect(): Promise<{ ok: boolean; detail: string }> {
  // Cannot redeploy from here — flag for manual deploy
  return { ok: false, detail: "redeploy_function requires manual deploy" };
}

async function repairCron(): Promise<{ ok: boolean; detail: string }> {
  try {
    const { error } = await supabase.rpc("evaluate_outreach_gate" as any);
    return { ok: !error, detail: error?.message ?? "gate evaluated" };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body: RepairRequest = await req.json().catch(() => ({} as RepairRequest));
  const start = Date.now();
  let result: { ok: boolean; detail: string } = { ok: false, detail: "no_action" };

  switch (body.action) {
    case "recreate_webhook":
      if (body.provider === "resend") result = await repairResendWebhook();
      else result = { ok: false, detail: `no automated repair for ${body.provider}` };
      break;
    case "recreate_cron":
      result = await repairCron();
      break;
    case "redeploy_function":
      result = await repairRedirect();
      break;
    case "rotate_secret":
      result = { ok: false, detail: "rotate_secret requires admin action" };
      break;
    default:
      result = { ok: false, detail: `unknown action: ${body.action}` };
  }

  await supabase.from("outreach_repair_runs").insert({
    provider: body.provider, action: body.action,
    outcome: result.ok ? "success" : "manual_required",
    error: result.ok ? null : result.detail,
    duration_ms: Date.now() - start,
    payload: { failure_reason: body.failure_reason ?? null },
  });

  return new Response(JSON.stringify({ ok: result.ok, detail: result.detail }), {
    status: result.ok ? 200 : 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
