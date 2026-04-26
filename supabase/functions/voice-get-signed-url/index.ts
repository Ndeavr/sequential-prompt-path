/**
 * voice-get-signed-url — Returns a signed WebSocket URL for ElevenLabs Conversational AI.
 *
 * RELIABILITY V2:
 * - In-process cache for active agent_id (60s TTL) → eliminates DB cold start on hot path.
 * - DB lookup and ElevenLabs call run in parallel when cache is warm.
 * - Always returns JSON with `fallback: "chat"` flag when voice unavailable
 *   (instead of bare HTTP 500) so frontend can fail-safe to chat.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-process cache (per worker instance) — 60s TTL on active config.
const CACHE_TTL_MS = 60_000;
let cachedConfig: any = null;
let cachedAt = 0;

interface VoiceConfigRow {
  agent_id: string | null;
  voice_id: string | null;
  language_default: string | null;
  allow_switch: boolean | null;
  stability: number | null;
  similarity: number | null;
  style: number | null;
  speaker_boost: boolean | null;
}

function getUpstreamCode(errorText: string): string | undefined {
  try { return JSON.parse(errorText)?.detail?.code; } catch { return undefined; }
}

async function fetchSignedUrl(apiKey: string, agentId: string) {
  return fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    { headers: { "xi-api-key": apiKey } },
  );
}

async function fetchFirstAvailableAgentId(apiKey: string): Promise<string | null> {
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/convai/agents?page_size=1", {
      headers: { "xi-api-key": apiKey },
    });
    if (!r.ok) return null;
    const payload = await r.json();
    return payload?.agents?.[0]?.agent_id ?? null;
  } catch { return null; }
}

async function loadConfig(environment: string): Promise<VoiceConfigRow | null> {
  const now = Date.now();
  if (cachedConfig && now - cachedAt < CACHE_TTL_MS) {
    return cachedConfig;
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await supabase
      .from("voice_configs")
      .select("agent_id, voice_id, language_default, allow_switch, stability, similarity, style, speaker_boost")
      .eq("environment", environment)
      .eq("status", "active")
      .single();
    if (data) {
      cachedConfig = data;
      cachedAt = now;
    }
    return data as VoiceConfigRow | null;
  } catch (e) {
    console.warn("[voice-get-signed-url] config lookup failed:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "Voice service not configured",
        fallback: "chat",
        message: "Connexion vocale indisponible. Chat activé.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const environment = body?.environment || "prod";

  // ─── HOT PATH: Use cached config if available ───
  let config = (Date.now() - cachedAt < CACHE_TTL_MS) ? cachedConfig : null;
  let configAgentId = config?.agent_id || Deno.env.get("ELEVENLABS_AGENT_ID");

  if (!config && !configAgentId) {
    // No cache, no env var — must wait on DB.
    config = await loadConfig(environment);
    configAgentId = config?.agent_id || Deno.env.get("ELEVENLABS_AGENT_ID");
  } else {
    // Refresh cache async in background (non-blocking).
    if (Date.now() - cachedAt >= CACHE_TTL_MS) {
      loadConfig(environment).catch(() => {});
    }
  }

  if (!configAgentId) {
    return new Response(
      JSON.stringify({
        error: "No voice agent configured",
        fallback: "chat",
        message: "Aucun agent vocal configuré. Chat activé.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let resolvedAgentId = configAgentId;
  let fallbackUsed = false;
  let fallbackReason: string | null = null;

  let response = await fetchSignedUrl(ELEVENLABS_API_KEY, resolvedAgentId);
  let errorText = response.ok ? "" : await response.text();

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

  // Non-blocking log
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    supabase.from("voice_runtime_logs").insert({
      agent_id_used: resolvedAgentId,
      voice_id_used: config?.voice_id || null,
      language: config?.language_default || "fr",
      fallback_used: fallbackUsed,
      fallback_reason: fallbackReason,
      error_message: response.ok ? null : errorText.slice(0, 500),
      latency_ms: latencyMs,
      event_type: fallbackUsed ? "fallback" : response.ok ? "session_start" : "error",
      metadata: { environment, configAgentId },
    }).then(() => {}).catch(() => {});
  } catch (_) { /* non-blocking */ }

  if (!response.ok) {
    return new Response(
      JSON.stringify({
        error: "Failed to get signed URL",
        status: response.status,
        detail: errorText,
        fallback: "chat",
        message: "Connexion vocale indisponible. Chat activé.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
      stability: config?.stability ?? 0.56,
      similarity: config?.similarity ?? 0.84,
      style: config?.style ?? 0.14,
      speakerBoost: config?.speaker_boost ?? true,
      fallbackUsed,
      latencyMs,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
