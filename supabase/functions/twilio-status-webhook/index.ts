// Twilio status callback — updates communication_logs.delivery_status.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
  const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supa = createClient(SUPA_URL, SRK, { auth: { autoRefreshToken: false, persistSession: false } });

  const form = await req.formData();
  const sid = String(form.get("MessageSid") || "");
  const status = String(form.get("MessageStatus") || "").toLowerCase();
  const errCode = form.get("ErrorCode");
  if (!sid) return new Response("ok", { headers: cors });

  const map: Record<string, string> = {
    queued: "queued", sending: "sent", sent: "sent", delivered: "delivered",
    failed: "failed", undelivered: "undelivered",
  };
  const newStatus = map[status] ?? status;

  const updates: Record<string, unknown> = { delivery_status: newStatus };
  if (newStatus === "delivered") updates.delivered_at = new Date().toISOString();
  if (errCode) updates.error_message = `Twilio error ${errCode}`;

  const { data: log } = await supa.from("communication_logs")
    .update(updates).eq("provider_message_id", sid).select("id,contact_id").maybeSingle();

  // If failed/undelivered, trigger immediate fallback by promoting any queued fallback to now
  if (log && (newStatus === "failed" || newStatus === "undelivered")) {
    await supa.from("communication_fallback_queue")
      .update({ scheduled_for: new Date().toISOString() })
      .eq("parent_log_id", log.id).eq("processed", false).eq("cancelled", false);
  }

  return new Response("ok", { headers: cors });
});
