import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { blocker_id, action } = await req.json();
    if (!blocker_id) {
      return new Response(JSON.stringify({ error: "blocker_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: blocker } = await supabase
      .from("automation_blockers")
      .select("*")
      .eq("id", blocker_id)
      .single();

    if (!blocker) {
      return new Response(JSON.stringify({ error: "Blocker not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resolvedAction = action ?? "retry";

    if (resolvedAction === "retry" && blocker.job_id) {
      await supabase
        .from("automation_jobs")
        .update({ status: "queued", error_message: null })
        .eq("id", blocker.job_id);
    }

    const newStatus = resolvedAction === "ignore" ? "ignored" : resolvedAction === "retry" ? "retrying" : "resolved";

    await supabase
      .from("automation_blockers")
      .update({ status: newStatus, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", blocker_id);

    // Log the action
    await supabase.from("automation_action_logs").insert({
      engine_name: blocker.engine_name,
      job_id: blocker.job_id,
      action_type: resolvedAction,
      action_label: `Blocker ${resolvedAction}`,
      action_message: `${blocker.blocker_title} — ${resolvedAction}`,
      action_status: "completed",
    });

    return new Response(JSON.stringify({ success: true, action: resolvedAction }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
