/**
 * ws-voice — Real-time WebSocket voice endpoint for Alex.
 *
 * Route: /ws/voice (via Supabase Edge Functions)
 *
 * Protocol:
 *   Client → server:  session.start | audio.chunk | audio.stop | interrupt
 *   Server → client:  session.ready | state.change | audio.chunk.ack |
 *                      response.text | response.audio | response.done |
 *                      interrupt.ack | error
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { VoiceGateway } from "../_shared/voice-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve((req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // WebSocket upgrade
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response(
      JSON.stringify({ error: "WebSocket upgrade required. Send Upgrade: websocket header." }),
      { status: 426, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let gateway: VoiceGateway | null = null;

  socket.onopen = () => {
    gateway = new VoiceGateway(socket);
    console.log("[ws-voice] Client connected");
  };

  socket.onmessage = async (event) => {
    if (!gateway) return;
    try {
      await gateway.handleMessage(typeof event.data === "string" ? event.data : "");
    } catch (err) {
      console.error("[ws-voice] Message handler error:", err);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "error",
          message: err instanceof Error ? err.message : "Internal error",
        }));
      }
    }
  };

  socket.onclose = () => {
    console.log("[ws-voice] Client disconnected");
    gateway?.cleanup();
    gateway = null;
  };

  socket.onerror = (err) => {
    console.error("[ws-voice] Socket error:", err);
    gateway?.cleanup();
    gateway = null;
  };

  return response;
});
