/**
 * UNPRO — twilio-status webhook
 * Updates sms_messages.status on Twilio delivery callbacks.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const form = await req.formData();
    const MessageSid = String(form.get("MessageSid") || "");
    const MessageStatus = String(form.get("MessageStatus") || "");

    if (MessageSid) {
      await sb.from("sms_messages")
        .update({ status: MessageStatus, updated_at: new Date().toISOString() })
        .eq("message_sid", MessageSid);
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("twilio-status", e);
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
});
