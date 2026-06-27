// UNPRO — Send admin test SMS via Twilio + log canonical sent event.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAcquisitionEvent } from "../_shared/acquisitionEvents.ts";
import { sendSms } from "../_shared/twilioSend.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const body = await req.json().catch(() => ({}));
  const toNumber = body?.to || Deno.env.get("ADMIN_TEST_PHONE");
  const message = body?.message || `UNPRO acquisition test — ${new Date().toISOString()}`;

  if (!toNumber) {
    return new Response(JSON.stringify({ ok: false, error: "to phone number required (pass { to } or set ADMIN_TEST_PHONE)" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const result = await sendSms({
    to: toNumber,
    body: message,
    message_type: "test",
    template_key: "acq_test_send_sms",
    metadata: { source: "acq-test-send-sms", test: true },
  });

  if (result.status === "failed") {
    await logAcquisitionEvent({
      channel: "sms", event_type: "failed", provider: "twilio",
      metadata: { test: true, result },
    });
    return new Response(JSON.stringify({ ok: false, result }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  }

  await logAcquisitionEvent({
    channel: "sms", event_type: "sent", provider: "twilio",
    provider_event_id: result.twilio_sid ? `${result.twilio_sid}:test_send` : undefined,
    metadata: { test: true, to: toNumber, result },
  });

  return new Response(JSON.stringify({ ok: true, sid: result.twilio_sid, status: result.status, result }),
    { headers: { ...cors, "Content-Type": "application/json" } });
});
