// UNPRO — Phase 3: Resend webhook
// POST /engagement-webhook-resend
// Maps Resend events → acq_email_logs + engagement events (idempotent).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Resend event.type → canonical
const MAP: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "sent",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  try {
    const body = await req.json();
    const type: string = body.type ?? body.event ?? "";
    const data = body.data ?? body;
    const emailId: string | undefined = data.email_id ?? data.id;
    const to: string | undefined = Array.isArray(data.to) ? data.to[0] : data.to;
    const canonical = MAP[type] ?? type.replace(/^email\./, "");

    if (!emailId) {
      return new Response(JSON.stringify({ ok: false, error: "missing email id" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: canonical };
    if (canonical === "sent") patch.sent_at = now;
    if (canonical === "opened") patch.opened_at = now;
    if (canonical === "clicked") patch.clicked_at = now;
    if (canonical === "bounced" || canonical === "failed" || canonical === "complained") {
      patch.error = data.reason ?? data.bounce?.message ?? canonical;
    }

    await supabase.from("acq_email_logs").update(patch).eq("provider_message_id", emailId);

    await supabase.rpc("record_engagement_event", {
      _event_type: canonical,
      _channel: "email",
      _status: canonical,
      _provider: "resend",
      _provider_message_id: emailId,
      _error_message: patch.error ? String(patch.error) : null,
      _error_code: patch.error ? "RESEND_ERROR" : null,
      _metadata: { to, resend_type: type, data },
    });

    return new Response(JSON.stringify({ ok: true, id: emailId, status: canonical }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[engagement-webhook-resend]", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
