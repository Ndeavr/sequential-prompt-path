// UNPRO — Phase 3: Twilio status webhook
// POST /engagement-webhook-twilio  (application/x-www-form-urlencoded)
// Idempotently maps Twilio MessageStatus → acq_sms_logs.status + engagement events.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-twilio-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STATUS_MAP: Record<string, string> = {
  queued: "queued",
  sending: "sent",
  sent: "sent",
  delivered: "delivered",
  undelivered: "undelivered",
  failed: "failed",
  read: "delivered",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let params: Record<string, string> = {};
    if (contentType.includes("application/json")) {
      params = await req.json();
    } else {
      const raw = await req.text();
      params = Object.fromEntries(new URLSearchParams(raw));
    }

    const sid = params.MessageSid || params.SmsSid || params.message_sid;
    const rawStatus = (params.MessageStatus || params.SmsStatus || "").toLowerCase();
    const mapped = STATUS_MAP[rawStatus] ?? rawStatus ?? "unknown";
    const errorCode = params.ErrorCode || null;
    const errorMessage = params.ErrorMessage || null;

    if (!sid) {
      return new Response(JSON.stringify({ ok: false, error: "missing MessageSid" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Update the underlying SMS log (idempotent — trigger dedupes engagement)
    const patch: Record<string, unknown> = { status: mapped };
    if (mapped === "sent") patch.sent_at = new Date().toISOString();
    if (errorMessage || errorCode) patch.error = errorMessage ?? `TWILIO_${errorCode}`;

    await supabase.from("acq_sms_logs").update(patch).eq("provider_message_id", sid);

    // Belt-and-suspenders: also record engagement directly (idempotency key handles dupes)
    await supabase.rpc("record_engagement_event", {
      _event_type: mapped,
      _channel: "sms",
      _status: mapped,
      _provider: "twilio",
      _provider_message_id: sid,
      _error_code: errorCode ? `TWILIO_${errorCode}` : null,
      _error_message: errorMessage,
      _metadata: params,
    });

    return new Response(JSON.stringify({ ok: true, sid, status: mapped }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[engagement-webhook-twilio]", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
