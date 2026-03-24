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

    const fetchSignedUrl = (targetAgentId: string) =>
      fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${targetAgentId}`,
        {
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
        }
      );

    const getUpstreamCode = (errorText: string): string | undefined => {
      try {
        return JSON.parse(errorText)?.detail?.code;
      } catch {
        return undefined;
      }
    };

    const getUpstreamMessage = (errorText: string, fallback: string): string => {
      try {
        return JSON.parse(errorText)?.detail?.message ?? fallback;
      } catch {
        return fallback;
      }
    };

    let resolvedAgentId = agentId;
    let tokenResponse = await fetchConversationToken(resolvedAgentId);
    let signedUrlResponse = await fetchSignedUrl(resolvedAgentId);
    let tokenErrorText = tokenResponse.ok ? "" : await tokenResponse.text();
    let signedUrlErrorText = signedUrlResponse.ok ? "" : await signedUrlResponse.text();

    const shouldFallbackAgent =
      (tokenResponse.status === 404 && getUpstreamCode(tokenErrorText) === "agent_not_found") ||
      (signedUrlResponse.status === 404 && getUpstreamCode(signedUrlErrorText) === "agent_not_found");

    if (shouldFallbackAgent) {
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
          tokenResponse = await fetchConversationToken(resolvedAgentId);
          signedUrlResponse = await fetchSignedUrl(resolvedAgentId);
          tokenErrorText = tokenResponse.ok ? "" : await tokenResponse.text();
          signedUrlErrorText = signedUrlResponse.ok ? "" : await signedUrlResponse.text();
        }
      }
    }

    if (!tokenResponse.ok && !signedUrlResponse.ok) {
      console.error(
        "[alex-conversation-token] ElevenLabs errors:",
        tokenResponse.status,
        tokenErrorText,
        signedUrlResponse.status,
        signedUrlErrorText
      );

      const message = getUpstreamMessage(tokenErrorText || signedUrlErrorText, "Failed to get conversation credentials");
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = tokenResponse.ok ? (await tokenResponse.json()).token : null;
    const signedUrl = signedUrlResponse.ok ? (await signedUrlResponse.json()).signed_url : null;

    return new Response(JSON.stringify({ token, signedUrl, agentId: resolvedAgentId }), {
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
