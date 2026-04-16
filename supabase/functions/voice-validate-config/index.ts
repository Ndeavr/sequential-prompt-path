/**
 * voice-validate-config — Validates that the configured agent_id
 * is a real ElevenLabs conversational agent (NOT a voice_id).
 *
 * Updates the voice_agent_mappings table with the validation result.
 * Logs any mismatch to voice_runtime_logs.
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
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { agent_id, voice_id } = body;

    if (!agent_id) {
      return new Response(
        JSON.stringify({ error: "agent_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Validate agent_id against ElevenLabs ───
    const agentCheck = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agent_id}`,
      { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
    );

    const agentValid = agentCheck.ok;
    let agentError: string | null = null;

    if (!agentValid) {
      const errorText = await agentCheck.text();
      try {
        const parsed = JSON.parse(errorText);
        agentError = parsed?.detail?.message || `HTTP ${agentCheck.status}`;
      } catch {
        agentError = `HTTP ${agentCheck.status}: ${errorText.slice(0, 200)}`;
      }
    }

    // ─── Detect voice_id used as agent_id (common mistake) ───
    const looksLikeVoiceId =
      agent_id.length === 20 && !agent_id.startsWith("agent_");
    const isMismatch = !agentValid || looksLikeVoiceId;

    // ─── Update mapping ───
    await supabase
      .from("voice_agent_mappings")
      .update({
        valid: agentValid && !looksLikeVoiceId,
        last_verified_at: new Date().toISOString(),
        verification_error: isMismatch
          ? (looksLikeVoiceId
              ? `"${agent_id}" looks like a voice_id, not an agent_id. Agent IDs start with "agent_".`
              : agentError)
          : null,
      })
      .eq("agent_id", agent_id);

    // ─── Log mismatch ───
    if (isMismatch) {
      await supabase.from("voice_runtime_logs").insert({
        agent_id_used: agent_id,
        voice_id_used: voice_id || null,
        language: "fr",
        fallback_used: false,
        event_type: "mismatch",
        error_message: looksLikeVoiceId
          ? `Voice ID "${agent_id}" was used as agent_id`
          : agentError,
        metadata: { looksLikeVoiceId, agentCheckStatus: agentCheck.status },
      });
    }

    // ─── If invalid, try to find first valid agent ───
    let suggestedAgent: string | null = null;
    if (!agentValid) {
      const agentsList = await fetch(
        "https://api.elevenlabs.io/v1/convai/agents?page_size=1",
        { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
      );
      if (agentsList.ok) {
        const payload = await agentsList.json();
        suggestedAgent = payload?.agents?.[0]?.agent_id ?? null;
      }
    }

    return new Response(
      JSON.stringify({
        valid: agentValid && !looksLikeVoiceId,
        agent_id,
        agentError,
        looksLikeVoiceId,
        suggestedAgent,
        message: isMismatch
          ? looksLikeVoiceId
            ? "CRITICAL: A voice_id was used as agent_id. These are different concepts."
            : "Agent not found on ElevenLabs."
          : "Configuration valid.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[voice-validate-config] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
