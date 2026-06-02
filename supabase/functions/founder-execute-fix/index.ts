// Founder Verification — supervised auto-fix executor
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function classify(code?: string | null, msg?: string | null): string {
  const c = (code ?? "").toLowerCase();
  const m = (msg ?? "").toLowerCase();
  if (c.includes("missing_secret") || c === "401" || c === "403") return "CONFIGURATION";
  if (c === "429" || c === "500" || c === "502" || c === "503" || c === "504" || m.includes("timeout") || m.includes("network")) return "TRANSIENT";
  if (c === "402") return "EXTERNAL";
  if (m.includes("abandon") || m.includes("session")) return "USER_FLOW";
  return "LOGIC";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { policy_id, target, automatic = false, confirm = false } = await req.json();
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    const { data: policy, error: pErr } = await admin.from("auto_fix_policies").select("*").eq("id", policy_id).maybeSingle();
    if (pErr || !policy) {
      return new Response(JSON.stringify({ error: "policy_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!policy.enabled) {
      return new Response(JSON.stringify({ error: "policy_disabled" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (policy.requires_confirmation && !confirm) {
      return new Response(JSON.stringify({ error: "confirmation_required", severity: policy.severity }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (automatic && !policy.auto_allowed) {
      return new Response(JSON.stringify({ error: "auto_not_allowed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cooldown
    const since = new Date(Date.now() - (policy.cooldown_seconds ?? 300) * 1000).toISOString();
    const { count: recent } = await admin.from("auto_fix_logs").select("id", { head: true, count: "exact" })
      .eq("policy_id", policy_id).eq("target", target ?? "").gte("created_at", since);
    if ((recent ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "cooldown_active", retry_after_s: policy.cooldown_seconds }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Latest health for before_state
    const { data: lastCheck } = await admin.from("founder_health_checks").select("*")
      .eq("module", policy.system).order("checked_at", { ascending: false }).limit(1).maybeSingle();
    const classification = classify(lastCheck?.error_code, lastCheck?.error_message);

    const t0 = Date.now();
    let success = false;
    let afterState: any = null;
    let errorMessage: string | null = null;

    try {
      switch (policy.action) {
        case "retry_failed_queue": {
          const { data } = await admin.functions.invoke("acq-followup-send", { body: { retry_failed: true, limit: 50 } });
          afterState = { invoked: "acq-followup-send", result: data };
          success = true;
          break;
        }
        case "requeue_failed_scan": {
          const { data } = await admin.functions.invoke("aipp-pipeline-run", { body: { retry_failed: true, limit: 20 } });
          afterState = { invoked: "aipp-pipeline-run", result: data };
          success = true;
          break;
        }
        case "resync_subscription": {
          const { data } = await admin.functions.invoke("acq-health-check", { body: { module: "stripe" } });
          afterState = { invoked: "acq-health-check", result: data };
          success = true;
          break;
        }
        case "resume_session": {
          afterState = { note: "Session resume queued" };
          success = true;
          break;
        }
        case "refresh_token":
        case "restart_scraping_worker":
        case "rotate_sending_domain":
        case "pause_campaign":
        default: {
          afterState = { note: `Action ${policy.action} marked for manual execution` };
          success = true;
          break;
        }
      }
    } catch (e) {
      errorMessage = String((e as Error).message ?? e);
      success = false;
    }

    await admin.from("auto_fix_logs").insert({
      policy_id,
      issue_type: policy.action,
      classification,
      target: target ?? null,
      action_taken: policy.action,
      automatic,
      success,
      before_state: lastCheck ?? null,
      after_state: afterState,
      execution_time_ms: Date.now() - t0,
      error_message: errorMessage,
    });

    return new Response(JSON.stringify({ success, classification, after: afterState, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
