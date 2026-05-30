// acq-send-outreach — sends a draft outreach message (email via Resend or SMS via Twilio)
// Defaults to DRY-RUN; requires { live: true } to actually send.
import { svc, startRun, finishRun, log, cors, requireService } from "../_shared/acq-logger.ts";

const FROM_EMAIL = "alex@unpro.ca";
const FROM_NAME = "Alex — UNPRO";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const s = svc();
  const { message_id, live } = await req.json().catch(() => ({}));
  if (!message_id) return new Response(JSON.stringify({ error: "message_id requis" }), { status: 400, headers: cors });

  const runId = await startRun(s, "outreach_send", { message_id, live: !!live });
  const { data: msg } = await s.from("outreach_messages").select("*").eq("id", message_id).maybeSingle();
  if (!msg) {
    await finishRun(s, runId, { status: "failed", error_summary: "Message introuvable" });
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: cors });
  }

  if (!live) {
    await log(s, runId, "outreach_send.dry_run", "info", `Aperçu uniquement (live=false)`, msg.prospect_id, {
      to: msg.to_value, subject: msg.subject_rendered, body_preview: (msg.body_rendered || "").slice(0, 200),
    });
    await finishRun(s, runId, { status: "succeeded", total_items: 1, succeeded_count: 1 });
    return new Response(JSON.stringify({ ok: true, dry_run: true, preview: { to: msg.to_value, subject: msg.subject_rendered, body: msg.body_rendered } }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Check provider health
  if (msg.channel_type === "email") {
    const h = await requireService(s, "resend");
    if (!h.ok) {
      await s.from("outreach_messages").update({ message_status: "failed", error_message: h.reason, failed_at: new Date().toISOString() }).eq("id", message_id);
      await log(s, runId, "outreach_send.health", "blocked", h.reason, msg.prospect_id);
      await finishRun(s, runId, { status: "failed", error_summary: h.reason });
      return new Response(JSON.stringify({ ok: false, blocked: true, reason: h.reason }), { headers: cors });
    }
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [msg.to_value],
          subject: msg.subject_rendered,
          text: msg.body_rendered,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || JSON.stringify(j));
      await s.from("outreach_messages").update({
        message_status: "sent", provider_message_id: j.id, sent_at: new Date().toISOString(),
      }).eq("id", message_id);
      if (msg.prospect_id) {
        await s.from("contractor_prospects").update({ outreach_status: "sent", updated_at: new Date().toISOString() }).eq("id", msg.prospect_id);
      }
      await log(s, runId, "outreach_send.email", "success", `Envoyé via Resend ${j.id}`, msg.prospect_id);
      await finishRun(s, runId, { status: "succeeded", total_items: 1, succeeded_count: 1 });
      return new Response(JSON.stringify({ ok: true, provider_id: j.id }), { headers: cors });
    } catch (e) {
      await s.from("outreach_messages").update({ message_status: "failed", error_message: String(e), failed_at: new Date().toISOString() }).eq("id", message_id);
      await log(s, runId, "outreach_send.email", "error", String(e), msg.prospect_id);
      await finishRun(s, runId, { status: "failed", error_summary: String(e) });
      return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors });
    }
  } else if (msg.channel_type === "sms") {
    const h = await requireService(s, "twilio");
    if (!h.ok) {
      await s.from("outreach_messages").update({ message_status: "failed", error_message: h.reason, failed_at: new Date().toISOString() }).eq("id", message_id);
      await log(s, runId, "outreach_send.health", "blocked", h.reason, msg.prospect_id);
      await finishRun(s, runId, { status: "failed", error_summary: h.reason });
      return new Response(JSON.stringify({ ok: false, blocked: true, reason: h.reason }), { headers: cors });
    }
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const tok = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const msvc = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
    try {
      const params = new URLSearchParams({ To: msg.to_value, Body: msg.body_rendered });
      if (msvc) params.set("MessagingServiceSid", msvc);
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: "Basic " + btoa(`${sid}:${tok}`), "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || JSON.stringify(j));
      await s.from("outreach_messages").update({
        message_status: "sent", provider_message_id: j.sid, sent_at: new Date().toISOString(),
      }).eq("id", message_id);
      if (msg.prospect_id) {
        await s.from("contractor_prospects").update({ outreach_status: "sent", updated_at: new Date().toISOString() }).eq("id", msg.prospect_id);
      }
      await log(s, runId, "outreach_send.sms", "success", `Envoyé via Twilio ${j.sid}`, msg.prospect_id);
      await finishRun(s, runId, { status: "succeeded", total_items: 1, succeeded_count: 1 });
      return new Response(JSON.stringify({ ok: true, provider_id: j.sid }), { headers: cors });
    } catch (e) {
      await s.from("outreach_messages").update({ message_status: "failed", error_message: String(e), failed_at: new Date().toISOString() }).eq("id", message_id);
      await log(s, runId, "outreach_send.sms", "error", String(e), msg.prospect_id);
      await finishRun(s, runId, { status: "failed", error_summary: String(e) });
      return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors });
    }
  }

  await finishRun(s, runId, { status: "failed", error_summary: `Canal inconnu: ${msg.channel_type}` });
  return new Response(JSON.stringify({ error: "Canal inconnu" }), { status: 400, headers: cors });
});
