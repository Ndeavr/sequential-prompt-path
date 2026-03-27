import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_token, user_id } = await req.json();
    if (!session_token || !user_id) {
      return new Response(JSON.stringify({ error: "session_token and user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Promote guest session
    const { data: result } = await supabase.rpc("fn_alex_promote_guest_session", {
      _session_token: session_token,
      _user_id: user_id,
    });

    if (!result?.promoted) {
      return new Response(JSON.stringify({ error: "No guest session found to promote" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get restored session data
    const { data: session } = await supabase
      .from("alex_sessions")
      .select("*")
      .eq("id", result.session_id)
      .single();

    // Get booking draft
    const { data: draft } = await supabase
      .from("alex_booking_drafts")
      .select("*")
      .eq("session_id", session_token)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Compute readiness
    const { data: readiness } = await supabase.rpc("fn_alex_compute_booking_readiness", {
      _session_id: result.session_id,
    });

    // Get next action
    const { data: nextAction } = await supabase.rpc("fn_alex_get_best_next_action", {
      _session_id: result.session_id,
    });

    // Log
    await supabase.from("alex_actions").insert({
      session_id: session_token,
      action_type: "resume_after_auth",
      action_status: "completed",
      trigger_source: "edge_function",
      payload: { user_id, readiness },
    });

    const shouldReopenCalendar = draft?.booking_status === "ready_for_calendar" ||
      draft?.booking_status === "calendar_opened" ||
      (readiness?.score >= 75 && session?.recommended_contractor_id);

    return new Response(JSON.stringify({
      restored_session: {
        id: session?.id,
        project_type: session?.project_type,
        project_city: session?.project_city,
        recommended_contractor_id: session?.recommended_contractor_id,
        current_step: session?.current_step,
      },
      restored_booking_draft: draft ? {
        id: draft.id,
        booking_status: draft.booking_status,
        contractor_id: draft.contractor_id,
        service_type: draft.service_type,
        city: draft.city,
      } : null,
      should_reopen_calendar: shouldReopenCalendar,
      next_action: nextAction,
      readiness,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("alex-resume-after-auth error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
