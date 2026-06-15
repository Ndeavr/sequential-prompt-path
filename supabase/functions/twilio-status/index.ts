// DEPRECATED — Legacy Twilio status webhook. Forwards body to twilio-status-v2.
// Kept as a thin shim for any Twilio configs still pointing at the old URL.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SRK, { auth: { autoRefreshToken: false, persistSession: false } });

    const form = await req.formData();
    const MessageSid = String(form.get("MessageSid") || "");
    const MessageStatus = String(form.get("MessageStatus") || "");

    // Best-effort legacy table update so nothing regresses.
    if (MessageSid) {
      await sb.from("sms_messages")
        .update({ status: MessageStatus, updated_at: new Date().toISOString() })
        .eq("message_sid", MessageSid);
    }

    // Forward to canonical v2 webhook (preserves audit in sms_events_v2 + retry queue).
    try {
      const params = new URLSearchParams();
      for (const [k, v] of form.entries()) params.append(k, String(v));
      const target = `${SUPABASE_URL.replace("supabase.co", "functions.supabase.co")}/functions/v1/twilio-status-v2`;
      await fetch(target, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Forwarded-From": "twilio-status" }, body: params.toString() });
    } catch (_) { /* swallow */ }

    console.warn("[twilio-status] DEPRECATED — point Twilio to twilio-status-v2");
    return new Response("ok", { status: 200, headers: cors });
  } catch (e) {
    console.error("twilio-status", e);
    return new Response("ok", { status: 200, headers: cors });
  }
});
