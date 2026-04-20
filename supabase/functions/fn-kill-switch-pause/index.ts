import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "forbidden_admin_only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action === "release" ? "release" : "pause";

    if (action === "pause") {
      // Activate kill switch
      await supabase
        .from("system_environment_state")
        .update({
          kill_switch_active: true,
          paused_at: new Date().toISOString(),
          paused_by: user.id,
          notes: body.reason || "Manual kill switch",
        })
        .eq("singleton", true);

      // Pause all automation schedules
      await supabase
        .from("automation_schedules")
        .update({ status: "paused" })
        .neq("status", "paused");

      // Cancel queued/running jobs
      await supabase
        .from("automation_jobs")
        .update({ status: "paused" })
        .in("status", ["queued", "running"]);

      return new Response(JSON.stringify({ success: true, action: "paused" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Release kill switch
      await supabase
        .from("system_environment_state")
        .update({
          kill_switch_active: false,
          paused_at: null,
          paused_by: null,
        })
        .eq("singleton", true);

      return new Response(JSON.stringify({ success: true, action: "released" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
