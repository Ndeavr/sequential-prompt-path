// UNPRO — Resend event webhook → canonical acquisition_events
// Configure in Resend dashboard: Webhooks → Add → this function URL.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAcquisitionEvent, AcqEventType } from "../_shared/acquisitionEvents.ts";
import { recordEmailEvent, EmailEventKind } from "../_shared/outreachEvents.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-signature, svix-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TYPE_MAP: Record<string, AcqEventType> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "sent",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "unsubscribed",
  "email.failed": "failed",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

  try {
    const body = await req.json();
    const type = String(body?.type || "");
    const eventType = TYPE_MAP[type];
    if (!eventType) return new Response(JSON.stringify({ ignored: type }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });

    const data = body?.data ?? {};
    const emailId = String(data?.email_id || data?.id || body?.id || "");
    const tags: Record<string, string> = data?.tags ?? {};
    const tracking_id = tags?.tracking_id ?? null;
    const contractor_id = tags?.contractor_id ?? null;
    const prospect_id = tags?.prospect_id ?? null;

    await logAcquisitionEvent({
      contractor_id,
      prospect_id,
      tracking_id,
      channel: "email",
      event_type: eventType,
      provider: "resend",
      provider_event_id: emailId ? `${emailId}:${type}` : null,
      metadata: {
        resend_type: type,
        to: data?.to,
        subject: data?.subject,
        bounce: data?.bounce,
        click: data?.click,
      },
    });

    // Canonical funnel: feed outreach_email_events keyed by Resend email_id
    const kindMap: Record<string, EmailEventKind> = {
      "email.sent": "sent",
      "email.delivered": "delivered",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
    };
    const kind = kindMap[type];
    if (emailId && kind) {
      await recordEmailEvent(emailId, kind, {
        recipient: Array.isArray(data?.to) ? data.to[0] : data?.to,
        subject: data?.subject,
        contractor_id: contractor_id ?? undefined,
        campaign_id: tags?.campaign ?? null,
        source: "resend_webhook",
      });
    }


    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[resend-events]", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
