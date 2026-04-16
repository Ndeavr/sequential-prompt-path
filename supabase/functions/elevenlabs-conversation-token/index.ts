/**
 * elevenlabs-conversation-token — Returns a signed WebSocket URL
 * for the active ElevenLabs Conversational AI agent.
 *
 * Agent source of truth:
 * 1. Request body `agentId`
 * 2. Secret `ELEVENLABS_AGENT_ID`
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
    const body = await req.json().catch(() => ({} as { agentId?: string }));
    const ELEVENLABS_AGENT_ID = body?.agentId || Deno.env.get("ELEVENLABS_AGENT_ID");

    if (!ELEVENLABS_API_KEY) {
      console.error("Missing ELEVENLABS_API_KEY");
      return new Response(
        JSON.stringify({ error: "Voice service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ELEVENLABS_AGENT_ID) {
      console.error("Missing ELEVENLABS_AGENT_ID");
      return new Response(
        JSON.stringify({ error: "Voice agent not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching signed URL for agent:", ELEVENLABS_AGENT_ID);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs signed-url error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get signed URL", status: response.status, detail: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Got signed URL successfully");

    return new Response(
      JSON.stringify({ signed_url: data.signed_url, agentId: ELEVENLABS_AGENT_ID }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("elevenlabs-conversation-token error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
