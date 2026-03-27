import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_token, user_id, language, entrypoint } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check for existing active session
    if (session_token) {
      const { data: existing } = await supabase.rpc("fn_alex_get_active_session", {
        _session_token: session_token,
      });
      if (existing?.found) {
        return new Response(JSON.stringify({
          session_id: existing.id,
          session_token,
          auth_state: existing.auth_state,
          current_step: existing.current_step,
          greeting: existing.auth_state === "authenticated"
            ? "Re-bonjour. On continue?"
            : "Oui, je vous écoute.",
          resumed: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Create new session
    const token = session_token || crypto.randomUUID();
    const isAuth = !!user_id;

    // Get user first name if authenticated
    let firstName: string | null = null;
    if (user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, full_name")
        .eq("id", user_id)
        .maybeSingle();
      firstName = profile?.first_name || profile?.full_name?.split(" ")[0] || null;
    }

    const { data: session, error } = await supabase
      .from("alex_sessions")
      .insert({
        user_id: user_id || null,
        session_token: token,
        session_type: entrypoint || "voice",
        language: language || "fr",
        voice_locale: "fr-QC",
        auth_state: isAuth ? "authenticated" : "guest",
        current_step: "listening",
      })
      .select("id")
      .single();

    if (error) throw error;

    // Log action
    await supabase.from("alex_actions").insert({
      session_id: token,
      action_type: "start_session",
      action_status: "completed",
      trigger_source: "edge_function",
      payload: { entrypoint, language, is_auth: isAuth },
    });

    const greeting = isAuth && firstName
      ? `Bonjour ${firstName}. Comment je peux vous aider?`
      : "Oui, je vous écoute.";

    return new Response(JSON.stringify({
      session_id: session.id,
      session_token: token,
      auth_state: isAuth ? "authenticated" : "guest",
      current_step: "listening",
      greeting,
      voice_config: {
        locale: "fr-QC",
        style: "natural_quebec_concierge",
        speed: 0.95,
      },
      resumed: false,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("alex-start-session error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
