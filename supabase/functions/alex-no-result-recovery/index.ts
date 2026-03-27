import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_token } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get session
    const { data: session } = await supabase
      .from("alex_sessions")
      .select("id, project_type, project_city")
      .eq("session_token", session_token)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect no result state
    const { data: noResultState } = await supabase.rpc("fn_alex_detect_no_result_state", {
      _session_id: session.id,
    });

    // If should expand, try wider search
    let expandedMatches: any[] = [];
    if (noResultState?.should_expand) {
      const { data: contractors } = await supabase
        .from("contractors")
        .select("id, business_name, specialty, city, aipp_score")
        .eq("status", "active")
        .order("aipp_score", { ascending: false })
        .limit(3);

      expandedMatches = (contractors || []).map((c: any) => ({
        contractor_id: c.id,
        display_name: c.business_name,
        match_score: 55, // partial
        explanation: `Disponible — spécialiste en ${c.specialty || "services généraux"}`,
      }));
    }

    // Mark session as no_result
    await supabase.from("alex_sessions").update({
      no_result_state: true,
      updated_at: new Date().toISOString(),
    }).eq("id", session.id);

    // Log event
    await supabase.from("alex_no_result_events").insert({
      session_id: session_token,
      service_type: session.project_type,
      city: session.project_city,
      radius_attempted: noResultState?.radius_attempted || 0,
      partial_matches_count: expandedMatches.length,
      waitlist_created: false,
    });

    // Choose recovery copy
    let recoveryCopy = "Je n'ai pas encore le fit idéal validé pour ça dans votre secteur.";
    if (expandedMatches.length > 0) {
      recoveryCopy += ` Mais j'ai ${expandedMatches.length} option${expandedMatches.length > 1 ? "s" : ""} pour vous.`;
    } else {
      recoveryCopy = "Je m'en occupe. On vous contacte rapidement avec la meilleure option.";
    }

    const recoveryMode = noResultState?.should_offer_waitlist
      ? "offer_waitlist"
      : expandedMatches.length > 0
        ? "show_partial_matches"
        : "expand_radius";

    return new Response(JSON.stringify({
      recovery_mode: recoveryMode,
      expanded_matches: expandedMatches,
      should_offer_waitlist: noResultState?.should_offer_waitlist || false,
      recovery_copy: recoveryCopy,
      no_result_state: noResultState,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("alex-no-result-recovery error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
