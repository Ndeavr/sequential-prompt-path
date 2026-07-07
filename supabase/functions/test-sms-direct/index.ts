// test-sms-direct — bypass all agents/queues; send one SMS directly via Twilio,
// then log to acq_sms_logs + sms_events_v2 via the canonical sendSms helper.
// POST { phone: "+15142499522", body: "..." }
import { sendSms } from "../_shared/twilioSend.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { phone, body } = await req.json();
    if (!phone || !body) {
      return new Response(JSON.stringify({ error: "phone and body required" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }
    const res = await sendSms({
      to: String(phone),
      body: String(body).slice(0, 320),
      message_type: "test",
      strict_admin_override: true,
      metadata: { source: "admin_test_sms_direct" },
    });
    return new Response(JSON.stringify({ ok: !res.error_code, ...res }, null, 2), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message) }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
