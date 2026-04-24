/**
 * voice-get-config — Single source of truth for Alex voice configuration.
 * Returns the active voice config (agent_id, voice_id, language settings)
 * for the requested environment.
 *
 * IMPORTANT: This is the ONLY place the frontend should get voice IDs from.
 * No hardcoded IDs anywhere in client code.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const environment = body?.environment || "prod";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("voice_configs")
      .select("*")
      .eq("environment", environment)
      .eq("status", "active")
      .single();

    if (error || !data) {
      console.error("[voice-get-config] No active config found:", error?.message);
      return new Response(
        JSON.stringify({
          error: "No active voice config",
          fallback: true,
          config: {
            agent_id: null,
            voice_id: "UJCi4DDncuo0VJDSIegj",
            language_default: "fr",
            allow_switch: false,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also fetch the mapping validation
    const { data: mapping } = await supabase
      .from("voice_agent_mappings")
      .select("valid, last_verified_at, verification_error")
      .eq("agent_id", data.agent_id)
      .eq("language", data.language_default)
      .single();

    return new Response(
      JSON.stringify({
        config: {
          agent_id: data.agent_id,
          voice_id: data.voice_id,
          language_default: data.language_default,
          allow_switch: data.allow_switch,
          environment: data.environment,
          label: data.label,
        },
        mapping: mapping
          ? {
              valid: mapping.valid,
              last_verified_at: mapping.last_verified_at,
              verification_error: mapping.verification_error,
            }
          : null,
        fallback: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[voice-get-config] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
