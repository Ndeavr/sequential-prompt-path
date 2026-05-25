// Retry an outbound autopilot run by re-invoking autopilot-mvp with the same params
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

    const { run_id, force_live } = await req.json();
    if (!run_id) throw new Error("run_id required");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: run, error: runErr } = await admin
      .from("autopilot_runs")
      .select("trade, cities, target_limit, dry_run")
      .eq("id", run_id)
      .single();
    if (runErr || !run) throw new Error(`Run not found: ${runErr?.message}`);

    await admin.from("outbound_run_logs").insert({
      run_id,
      step: "retry_requested",
      status: "info",
      message: `Retry par admin · force_live=${!!force_live}`,
      payload: { actor: userData.user.id, force_live: !!force_live },
    });

    // Re-invoke autopilot-mvp with same params (new run)
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
        dry_run: force_live ? false : run.dry_run,
      }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? "Retry invocation failed");

    return new Response(JSON.stringify({ ok: true, new_run: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("retry-outbound-run error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
