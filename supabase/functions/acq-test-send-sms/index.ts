// UNPRO — Send admin test SMS via Twilio + log canonical sent event.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAcquisitionEvent } from "../_shared/acquisitionEvents.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER") || Deno.env.get("TWILIO_FROM_NUMBER");
  const body = await req.json().catch(() => ({}));
  const toNumber = body?.to || Deno.env.get("ADMIN_TEST_PHONE");
  const message = body?.message || `UNPRO acquisition test — ${new Date().toISOString()}`;

  if (!accountSid || !authToken || !fromNumber) {
    return new Response(JSON.stringify({ ok: false, error: "Twilio credentials missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
  if (!toNumber) {
    return new Response(JSON.stringify({ ok: false, error: "to phone number required (pass { to } or set ADMIN_TEST_PHONE)" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const projectRef = (Deno.env.get("SUPABASE_URL") || "").match(/https?:\/\/([^.]+)/)?.[1] || "";
  const statusCallback = `https://${projectRef}.functions.supabase.co/twilio-status-events`;

  const params = new URLSearchParams({ To: toNumber, From: fromNumber, Body: message, StatusCallback: statusCallback });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json();

  if (!res.ok) {
    await logAcquisitionEvent({
      channel: "sms", event_type: "failed", provider: "twilio",
      metadata: { test: true, error: data, status: res.status },
    });
    return new Response(JSON.stringify({ ok: false, error: data, status: res.status }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  }

  await logAcquisitionEvent({
    channel: "sms", event_type: "sent", provider: "twilio",
    provider_event_id: `${data.sid}:test_send`,
    metadata: { test: true, to: toNumber, status_callback: statusCallback, twilio_status: data.status },
  });

  return new Response(JSON.stringify({ ok: true, sid: data.sid, status: data.status, status_callback: statusCallback }),
    { headers: { ...cors, "Content-Type": "application/json" } });
});
