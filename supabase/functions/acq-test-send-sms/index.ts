// UNPRO — Send admin test SMS via Twilio + log canonical sent event.
// Uses strict_admin_override so ADMIN_SMS_ALLOWLIST numbers bypass Lookup gate.
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
    metadata: { source: "acq-test-send-sms", test: true, strict_admin_override: true },
    strict_admin_override: true,
  });

  // Pull persisted guard metadata for verification payload.
  let phone_type: string | null = null;
  let sms_guard_reason: string | null = null;
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (result.event_id) {
      const { data } = await supa.from("sms_events_v2").select("metadata,status,twilio_sid").eq("id", result.event_id).maybeSingle();
      phone_type = (data?.metadata as any)?.phone_type ?? null;
      sms_guard_reason = (data?.metadata as any)?.sms_guard_reason ?? null;
    }
  } catch { /* noop */ }

  if (result.status === "failed" || (result as any).status?.startsWith?.("invalid") || result.status === "not_mobile" || result.status === "blocked" || result.status === "opted_out") {
    await logAcquisitionEvent({
      channel: "sms", event_type: "failed", provider: "twilio",
      metadata: { test: true, result, phone_type, sms_guard_reason },
    });
    return new Response(JSON.stringify({
      ok: false,
      destination: toNumber,
      phone_type,
      sms_guard_reason,
      twilio_sid: result.twilio_sid,
      status: result.status,
      result,
    }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  }

  await logAcquisitionEvent({
    channel: "sms", event_type: "sent", provider: "twilio",
    provider_event_id: result.twilio_sid ? `${result.twilio_sid}:test_send` : undefined,
    metadata: { test: true, to: toNumber, result, phone_type, sms_guard_reason },
  });

  return new Response(JSON.stringify({
    ok: true,
    destination: toNumber,
    phone_type,
    sms_guard_reason,
    twilio_sid: result.twilio_sid,
    status: result.status,
    result,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});
