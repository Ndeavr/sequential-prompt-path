// UNPRO — Send admin test email via Resend + log canonical sent event.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAcquisitionEvent } from "../_shared/acquisitionEvents.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const body = await req.json().catch(() => ({}));
  const to = body?.to || Deno.env.get("ADMIN_TEST_EMAIL");
  const from = body?.from || "UNPRO Test <onboarding@resend.dev>";
  const subject = body?.subject || `UNPRO acquisition test — ${new Date().toISOString()}`;
  const html = body?.html || `<p>UNPRO acquisition pipeline test message.</p>`;

  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "RESEND_API_KEY missing" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
  if (!to) {
    return new Response(JSON.stringify({ ok: false, error: "to email required (pass { to } or set ADMIN_TEST_EMAIL)" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const trackingId = crypto.randomUUID().replace(/-/g, "").slice(0, 10);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [to], subject, html,
      tags: [
        { name: "tracking_id", value: trackingId },
        { name: "campaign", value: "admin_test" },
      ],
    }),
  });
  const data = await res.json();

  if (!res.ok) {
    await logAcquisitionEvent({ channel: "email", event_type: "failed", provider: "resend",
      metadata: { test: true, error: data, status: res.status } });
    return new Response(JSON.stringify({ ok: false, error: data, status: res.status }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  }

  await logAcquisitionEvent({
    channel: "email", event_type: "sent", provider: "resend",
    provider_event_id: `${data.id}:test_send`,
    tracking_id: trackingId,
    metadata: { test: true, to, resend_id: data.id },
  });

  return new Response(JSON.stringify({ ok: true, resend_id: data.id, tracking_id: trackingId }),
    { headers: { ...cors, "Content-Type": "application/json" } });
});
