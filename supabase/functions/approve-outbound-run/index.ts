// Approve a dry-run / waiting_approval autopilot run: marks it approved and re-launches live
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) throw new Error("Auth required");
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin role required");

    const { run_id, relaunch_live } = await req.json();
    if (!run_id) throw new Error("run_id required");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: run, error: runErr } = await admin
      .from("autopilot_runs")
      .select("trade, cities, target_limit, status, dry_run")
      .eq("id", run_id)
      .single();
    if (runErr || !run) throw new Error(`Run not found: ${runErr?.message}`);

    // Mark approval log
    await admin.from("outbound_run_logs").insert({
      run_id,
      step: "approval_gate",
      status: "approved",
      message: `Run approuvé par admin · relaunch_live=${!!relaunch_live}`,
      payload: { actor: userData.user.id },
    });

    await admin
      .from("autopilot_runs")
      .update({
        status: relaunch_live ? "queued" : "completed",
        next_action: relaunch_live ? "Relancement live en cours" : "Approuvé",
        last_step: "approval_gate",
      })
      .eq("id", run_id);

    // Auto-approve all pending personalizations for this run's prospects
    const { data: companies } = await admin
      .from("outbound_companies")
      .select("id")
      .eq("autopilot_run_id", run_id);
    const companyIds = (companies ?? []).map((c: any) => c.id);
    if (companyIds.length) {
      const { data: leads } = await admin
        .from("outbound_leads")
        .select("id")
        .in("company_id", companyIds);
      const leadIds = (leads ?? []).map((l: any) => l.id);
      if (leadIds.length) {
        await admin
          .from("outbound_ai_personalizations")
          .update({ approved: true, approved_at: new Date().toISOString() })
          .in("lead_id", leadIds);
      }
      await admin
        .from("outbound_approvals")
        .update({ approval_status: "approved", reviewed_at: new Date().toISOString() })
        .in("prospect_id", companyIds);
    }

    let liveResult: any = null;
    if (relaunch_live) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/autopilot-mvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({
          trade: run.trade,
          cities: run.cities,
          limit: run.target_limit ?? 30,
          dry_run: false,
        }),
      });
      liveResult = await res.json();
      if (!res.ok) throw new Error(liveResult.error ?? "Live launch failed");
    }

    return new Response(
      JSON.stringify({ ok: true, approved_companies: companyIds.length, live: liveResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("approve-outbound-run error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
