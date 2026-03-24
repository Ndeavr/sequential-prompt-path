/**
 * UNPRO — Alex Conversation Token
 * Generates a single-use ElevenLabs Conversational AI token for real-time voice.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const body = await req.json().catch(() => ({}));
    const agentId = body.agentId || Deno.env.get("ELEVENLABS_AGENT_ID");
    if (!agentId) {
      return new Response(JSON.stringify({ error: "agentId is required — set ELEVENLABS_AGENT_ID secret or pass in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fetchConversationToken = (targetAgentId: string) =>
      fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${targetAgentId}`,
        {
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
        }
      );

    let resolvedAgentId = agentId;
    let response = await fetchConversationToken(resolvedAgentId);
    let upstreamErrorText = "";

    if (!response.ok) {
      upstreamErrorText = await response.text();

      let upstreamCode: string | undefined;
      try {
        upstreamCode = JSON.parse(upstreamErrorText)?.detail?.code;
      } catch {
        // noop
      }

      if (response.status === 404 && upstreamCode === "agent_not_found") {
        console.warn("[alex-conversation-token] Agent not found, trying first available agent");
        const agentsResponse = await fetch(
          "https://api.elevenlabs.io/v1/convai/agents?page_size=1",
          { headers: { "xi-api-key": ELEVENLABS_API_KEY } }
        );

        if (agentsResponse.ok) {
          const agentsPayload = await agentsResponse.json();
          const fallbackAgentId = agentsPayload?.agents?.[0]?.agent_id as string | undefined;

          if (fallbackAgentId) {
            resolvedAgentId = fallbackAgentId;
            response = await fetchConversationToken(resolvedAgentId);
            if (!response.ok) {
              upstreamErrorText = await response.text();
            }
          }
        }
      }
    }

    if (!response.ok) {
      console.error("[alex-conversation-token] ElevenLabs error:", response.status, upstreamErrorText);
      let message = "Failed to get conversation token";
      try {
        message = JSON.parse(upstreamErrorText)?.detail?.message ?? message;
      } catch {
        // noop
      }

      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token } = await response.json();

    return new Response(JSON.stringify({ token, agentId: resolvedAgentId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[alex-conversation-token] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
