/**
 * elevenlabs-conversation-token — Returns a signed WebSocket URL
 * for the active ElevenLabs Conversational AI agent.
 *
 * Agent source of truth:
 * 1. Request body `agentId`
 * 2. Secret `ELEVENLABS_AGENT_ID`
 *
 * Safety:
 * - If the configured agent ID is invalid, fall back to the first available
 *   conversational agent on the ElevenLabs account.
 * - This helps recover when a voice ID was accidentally stored as an agent ID.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type RequestBody = {
  agentId?: string;
};

function getUpstreamCode(errorText: string): string | undefined {
  try {
    return JSON.parse(errorText)?.detail?.code;
  } catch {
    return undefined;
  }
}

function getUpstreamMessage(errorText: string, fallback: string): string {
  try {
    return JSON.parse(errorText)?.detail?.message ?? fallback;
  } catch {
    return fallback;
  }
}

async function fetchSignedUrl(apiKey: string, agentId: string) {
  return fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    {
      headers: { "xi-api-key": apiKey },
    }
  );
}

async function fetchFirstAvailableAgentId(apiKey: string): Promise<string | null> {
  const response = await fetch("https://api.elevenlabs.io/v1/convai/agents?page_size=1", {
    headers: { "xi-api-key": apiKey },
  });

  if (!response.ok) {
    console.error("Failed to list ElevenLabs agents:", response.status, await response.text());
    return null;
  }

  const payload = await response.json();
  return payload?.agents?.[0]?.agent_id ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const body = await req.json().catch(() => ({} as RequestBody));
    const requestedAgentId = body?.agentId || Deno.env.get("ELEVENLABS_AGENT_ID");

    if (!ELEVENLABS_API_KEY) {
      console.error("Missing ELEVENLABS_API_KEY");
      return new Response(
        JSON.stringify({ error: "Voice service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!requestedAgentId) {
      console.error("Missing ELEVENLABS_AGENT_ID");
      return new Response(
        JSON.stringify({ error: "Voice agent not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let resolvedAgentId = requestedAgentId;
    let fallbackUsed = false;
    let response = await fetchSignedUrl(ELEVENLABS_API_KEY, resolvedAgentId);
    let errorText = response.ok ? "" : await response.text();

    const shouldFallbackAgent =
      response.status === 404 && getUpstreamCode(errorText) === "agent_not_found";

    if (shouldFallbackAgent) {
      console.warn(
        `[elevenlabs-conversation-token] Agent not found (${requestedAgentId}). Trying first available agent.`
      );

      const fallbackAgentId = await fetchFirstAvailableAgentId(ELEVENLABS_API_KEY);
      if (fallbackAgentId && fallbackAgentId !== requestedAgentId) {
        resolvedAgentId = fallbackAgentId;
        response = await fetchSignedUrl(ELEVENLABS_API_KEY, resolvedAgentId);
        errorText = response.ok ? "" : await response.text();
        fallbackUsed = response.ok;
      }
    }

    if (!response.ok) {
      console.error("ElevenLabs signed-url error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to get signed URL",
          status: response.status,
          detail: errorText,
          hint:
            shouldFallbackAgent || getUpstreamCode(errorText) === "agent_not_found"
              ? "ELEVENLABS_AGENT_ID must be an ElevenLabs conversational agent ID, not a voice ID."
              : undefined,
          upstream_message: getUpstreamMessage(errorText, "Failed to connect to ElevenLabs agent"),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Got signed URL successfully", { agentId: resolvedAgentId, fallbackUsed });

    return new Response(
      JSON.stringify({
        signed_url: data.signed_url,
        signedUrl: data.signed_url,
        agentId: resolvedAgentId,
        fallbackUsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("elevenlabs-conversation-token error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
