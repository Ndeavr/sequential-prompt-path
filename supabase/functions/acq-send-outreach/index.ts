// acq-send-outreach — sends a draft outreach message (email via Resend or SMS via Twilio)
// Defaults to DRY-RUN; requires { live: true } to actually send.
import { svc, startRun, finishRun, log, cors, requireService } from "../_shared/acq-logger.ts";
import { requireSecrets, structuredError, structuredOk, jsonResponse } from "../_shared/acq-preflight.ts";

const FROM_EMAIL = "alex@unpro.ca";
const FROM_NAME = "Alex — UNPRO";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const s = svc();
  try {
    const body = await req.json().catch(() => ({}));
    const { message_id, live, batch, pause, require_approval, limit,
            prospect_id, channel, dry_run, test_to_admin } = body ?? {};

    // Pause mode → no-op acknowledgement
    if (pause) {
      return structuredOk("pause_campaign", { paused: true, message: "Campagne mise en pause." });
    }

    // Test-to-admin / ad-hoc preview from a prospect_id + channel (used by the cockpit)
    if (prospect_id && channel && !message_id) {
      // Preflight per channel
      const step = channel === "sms" ? "test_sms" : "test_email";
      const required = channel === "sms"
        ? ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"]
        : ["RESEND_API_KEY"];
      const block = requireSecrets(step, required);
      if (block) return block;

      // Pick a latest draft variant for that prospect+channel
      const { data: variant } = await s
        .from("contractor_outreach_tests")
        .select("subject,body,cta")
        .eq("prospect_id", prospect_id)
        .eq("channel", channel)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!variant) {
        return structuredError({
          ok: false, step,
          error_code: "NO_VARIANT",
          message: `Aucune variante ${channel.toUpperCase()} générée pour ce prospect.`,
          next_action: "Cliquer d'abord sur « Generate messages ».",
        });
      }
      // In dry_run/test_to_admin we just echo the preview — no provider call.
      if (dry_run !== false) {
        return structuredOk(step, {
          dry_run: true,
          test_to_admin: !!test_to_admin,
          preview: {
            channel,
            subject: variant.subject ?? null,
            body: variant.body ?? "",
            cta: variant.cta ?? null,
          },
          message: `Aperçu ${channel} prêt (mode test).`,
        });
      }
      // Live path not supported via ad-hoc — require a real message_id
      return structuredError({
        ok: false, step,
        error_code: "MISSING_MESSAGE",
        message: "Envoi LIVE depuis prospect_id non supporté. Passer par un message_id approuvé.",
        next_action: "Générer un message → approuver → Launch outreach.",
      });
    }

    // Batch mode → fan out over pending drafts
    if (batch) {
      let q = s.from("outreach_messages").select("id, prospect_id").eq("message_status", "draft").limit(Number(limit ?? 25));
      if (require_approval) q = q.eq("approved", true);
      const { data: drafts, error } = await q;
      if (error) {
        return structuredError({
          ok: false, step: "launch_outreach",
          error_code: "DB_ERROR", message: error.message,
          next_action: "Vérifier la table outreach_messages.",
        });
      }
      const ids = (drafts ?? []).map((d: any) => d.id);
      if (ids.length === 0) {
        return structuredOk("launch_outreach", { batch: true, sent: 0, message: "Aucun brouillon prêt à envoyer." });
      }
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/acq-send-outreach`;
      const auth = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
      const results = await Promise.allSettled(ids.map((id) =>
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: auth }, body: JSON.stringify({ message_id: id, live: !!live }) })
          .then((r) => r.json().then((j) => ({ id, ok: r.ok, ...j })))
      ));
      return structuredOk("launch_outreach", {
        batch: true, total: ids.length,
        results: results.map((r) => r.status === "fulfilled" ? r.value : { error: String(r.reason) }),
      });
    }

    if (!message_id) {
      return structuredError({
        ok: false, step: "outreach_send",
        error_code: "MISSING_INPUT",
        message: "message_id requis (ou utiliser prospect_id + channel pour un aperçu).",
        next_action: "Sélectionner un prospect et générer un message d'abord.",
      });
    }

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
