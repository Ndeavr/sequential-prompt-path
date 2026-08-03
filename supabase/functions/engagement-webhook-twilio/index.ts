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

    // Attribution passed through the StatusCallback URL query string.
    const url = new URL(req.url);
    const prospectIdParam = url.searchParams.get("prospect_id");
    const campaignIdParam = url.searchParams.get("campaign_id");
    const isUuid = (v: string | null) =>
      !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    const prospectId = isUuid(prospectIdParam) ? prospectIdParam : null;
    const campaignId = isUuid(campaignIdParam) ? campaignIdParam : null;

    const nowIso = new Date().toISOString();

    // Update the underlying SMS log (idempotent — trigger dedupes engagement)
    const patch: Record<string, unknown> = { status: mapped };
    if (mapped === "sent") patch.sent_at = nowIso;
    if (errorMessage || errorCode) patch.error = errorMessage ?? `TWILIO_${errorCode}`;
    if (campaignId) patch.campaign_id = campaignId;

    const { data: logRows } = await supabase
      .from("acq_sms_logs")
      .update(patch)
      .eq("provider_message_id", sid)
      .select("id, prospect_id");

    const resolvedProspectId =
      (logRows?.[0]?.prospect_id as string | undefined) ?? prospectId ?? null;

    // Mirror terminal delivery states onto the prospect so the funnel is truthful.
    if (resolvedProspectId && ["delivered", "undelivered", "failed"].includes(mapped)) {
      const prospectPatch: Record<string, unknown> = {
        outreach_status: mapped,
        last_action_at: nowIso,
      };
      if (mapped === "delivered") prospectPatch.outreach_delivered_at = nowIso;
      if (mapped !== "delivered") {
        prospectPatch.outreach_failure_reason = errorCode
          ? `TWILIO_${errorCode}`
          : (errorMessage ?? mapped);
      }
      await supabase
        .from("verified_contractor_prospects")
        .update(prospectPatch)
        .eq("id", resolvedProspectId);
    }

    // Belt-and-suspenders: also record engagement directly (idempotency key handles dupes)
    await supabase.rpc("record_engagement_event", {
      _event_type: mapped,
      _channel: "sms",
      _status: mapped,
      _provider: "twilio",
      _provider_message_id: sid,
      _prospect_id: resolvedProspectId,
      _source_table: "acq_sms_logs",
      _source_row_id: (logRows?.[0]?.id as string | undefined) ?? null,
      _error_code: errorCode ? `TWILIO_${errorCode}` : null,
      _error_message: errorMessage,
      _metadata: { ...params, campaign_id: campaignId },
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
