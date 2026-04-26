/**
 * voice-get-signed-url — Gets a signed WebSocket URL for ElevenLabs
 * Conversational AI using the centralized voice_configs table.
 *
 * This REPLACES elevenlabs-conversation-token as the canonical endpoint.
 * It reads agent_id from DB (never from client), validates it,
 * and falls back intelligently if the agent is not found.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getUpstreamCode(errorText: string): string | undefined {
  try { return JSON.parse(errorText)?.detail?.code; } catch { return undefined; }
}

async function fetchSignedUrl(apiKey: string, agentId: string) {
  return fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { "xi-api-key": apiKey } }
  );
}

async function fetchFirstAvailableAgentId(apiKey: string): Promise<string | null> {
  const response = await fetch("https://api.elevenlabs.io/v1/convai/agents?page_size=1", {
    headers: { "xi-api-key": apiKey },
  });
  if (!response.ok) return null;
  const payload = await response.json();
  return payload?.agents?.[0]?.agent_id ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Voice service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const environment = body?.environment || "prod";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Get config from DB (single source of truth) ───
    const { data: config } = await supabase
      .from("voice_configs")
      .select("agent_id, voice_id, language_default, allow_switch, stability, similarity, style, speaker_boost")
      .eq("environment", environment)
      .eq("status", "active")
      .single();

    // Fallback to ELEVENLABS_AGENT_ID secret if no DB config
    const configAgentId = config?.agent_id || Deno.env.get("ELEVENLABS_AGENT_ID");

    if (!configAgentId) {
      return new Response(
        JSON.stringify({ error: "No voice agent configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let resolvedAgentId = configAgentId;
    let fallbackUsed = false;
    let fallbackReason: string | null = null;

    // ─── Try configured agent ───
    let response = await fetchSignedUrl(ELEVENLABS_API_KEY, resolvedAgentId);
    let errorText = response.ok ? "" : await response.text();

    // ─── Fallback if agent not found ───
    if (response.status === 404 && getUpstreamCode(errorText) === "agent_not_found") {
      fallbackReason = `Agent "${resolvedAgentId}" not found`;
      console.warn(`[voice-get-signed-url] ${fallbackReason}. Trying first available agent.`);

      const fallbackAgentId = await fetchFirstAvailableAgentId(ELEVENLABS_API_KEY);
      if (fallbackAgentId && fallbackAgentId !== resolvedAgentId) {
        resolvedAgentId = fallbackAgentId;
        response = await fetchSignedUrl(ELEVENLABS_API_KEY, resolvedAgentId);
        errorText = response.ok ? "" : await response.text();
        fallbackUsed = response.ok;
      }
    }

    const latencyMs = Date.now() - startTime;

    // ─── Log the event ───
    try {
      await supabase.from("voice_runtime_logs").insert({
        agent_id_used: resolvedAgentId,
        voice_id_used: config?.voice_id || null,
        language: config?.language_default || "fr",
        fallback_used: fallbackUsed,
        fallback_reason: fallbackReason,
        error_message: response.ok ? null : errorText.slice(0, 500),
        latency_ms: latencyMs,
        event_type: fallbackUsed ? "fallback" : response.ok ? "session_start" : "error",
        metadata: { environment, configAgentId },
      });
    } catch (_) { /* non-blocking */ }

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to get signed URL",
          status: response.status,
          detail: errorText,
          hint: "ELEVENLABS_AGENT_ID must be a conversational agent ID, not a voice ID.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        signed_url: data.signed_url,
        signedUrl: data.signed_url,
        agentId: resolvedAgentId,
        voiceId: config?.voice_id || null,
        languageDefault: config?.language_default || "fr",
        allowSwitch: config?.allow_switch ?? true,
        fallbackUsed,
        latencyMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[voice-get-signed-url] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
