/**
 * alex-live-token — Securely delivers Gemini API key to authenticated clients
 * for Gemini Live (Native Audio) WebSocket connections.
 * 
 * Returns the API key + voice config so the client can establish
 * a direct WebSocket connection with Gemini Live.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return config for Gemini Live session
    return new Response(
      JSON.stringify({
        apiKey: GEMINI_API_KEY,
        model: "gemini-3.1-flash-live-preview",
        voiceName: "Aoede",
        fallbackVoiceName: "Zephyr",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("alex-live-token error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
