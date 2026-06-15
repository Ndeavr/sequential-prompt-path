// UNPRO — Picks due rows from sms_retry_queue and re-sends via the shared twilioSend module.
// Schedule via pg_cron every 5 minutes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: due, error } = await supabase
    .from("sms_retry_queue")
    .select("id, event_id, attempt")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .limit(50);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

  let processed = 0, sent = 0, skipped = 0;
  for (const job of due ?? []) {
    processed++;
    const { data: ev } = await supabase.from("sms_events_v2").select("*").eq("id", job.event_id).single();
    if (!ev) { skipped++; await supabase.from("sms_retry_queue").update({ status: "skipped", processed_at: new Date().toISOString() }).eq("id", job.id); continue; }
    // Pull body from metadata if available, otherwise skip (we only preview-stored 160 chars).
    const body = (ev.metadata && (ev.metadata as any).body) || ev.message_preview || "";
    if (!body) { skipped++; await supabase.from("sms_retry_queue").update({ status: "skipped", processed_at: new Date().toISOString() }).eq("id", job.id); continue; }
    const result = await sendSms({
      to: ev.normalized_phone ?? ev.raw_phone,
      body,
      message_type: ev.message_type,
      template_key: ev.template_key ?? undefined,
      lead_id: ev.lead_id ?? undefined,
      contractor_id: ev.contractor_id ?? undefined,
      campaign_id: ev.campaign_id ?? undefined,
      metadata: { ...(ev.metadata ?? {}), retry_of: ev.id },
      attempt_number: job.attempt,
    });
    sent++;
    await supabase.from("sms_retry_queue").update({
      status: "done", processed_at: new Date().toISOString(), result_event_id: result.event_id,
    }).eq("id", job.id);
  }

  return new Response(JSON.stringify({ processed, sent, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
