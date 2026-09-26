/**
 * contractor-appointment-notify — admin-only, test-batch contractor notifications.
 *
 * mode "preview": resolves recipients + exact message, sends NOTHING.
 * mode "send":    requires confirm === "ENVOYER" and the exact recipient set
 *                 returned by preview (preview_hash). Max 10 per batch.
 * mode "report":  admin pipeline results with delivery reconciled from
 *                 sms_events_v2 / email_send_log (real provider logs only).
 *
 * Channel: email first when the contractor has an email; SMS only when
 * requested and allowed for this batch. In-app notification is always kept.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdminCaller, maskPhone } from "../_shared/requireAdminCaller.ts";
import { sendSms } from "../_shared/twilioSend.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SITE = "https://unpro.ca";
const MAX_BATCH = 10;
const URL_ = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Pair = { appointment_id: string; contractor_id?: string };
type Channel = "email" | "sms";

function maskEmail(e: string) {
  const [u, d] = e.split("@");
  return `${u.slice(0, 2)}***@${d ?? ""}`;
}
function randToken() {
  const b = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function smsBody(p: { project: string; city: string; date: string }, links: Record<string, string>) {
  const ctx = [p.project, p.city, p.date].filter(Boolean).join(", ");
  return `UNPRO — Demande de rendez-vous exclusive${ctx ? ` : ${ctx}` : ""}.\n` +
    `Accepter : ${links.accept}\nAutres plages : ${links.propose}\nRefuser : ${links.decline}\n` +
    `Répondez STOP pour ne plus recevoir de messages.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const caller = await requireAdminCaller(req, cors, "contractor-appointment-notify");
  if (!caller.ok) return caller.response;
  const svc = createClient(URL_, SRK);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const mode = body?.mode as "preview" | "send" | "report";

  if (mode === "report") {
    const { data: rows, error } = await svc
      .from("appointment_contractor_notifications")
      .select("*, contractors(business_name, city)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return json({ ok: false, error: error.message }, 500);
    // Reconcile delivery from real provider logs.
    for (const r of rows ?? []) {
      if (!r.provider_ref || r.status === "delivered" || r.status === "failed") continue;
      let next: string | null = null; let err: string | null = null;
      if (r.channel === "sms") {
        const { data: ev } = await svc.from("sms_events_v2").select("status, error_message").eq("id", r.provider_ref).maybeSingle();
        const s = String(ev?.status ?? "");
        if (s === "delivered") next = "delivered";
        else if (["failed", "undelivered"].includes(s) || s.startsWith("blocked")) { next = "failed"; err = ev?.error_message ?? s; }
      } else {
        const { data: ev } = await svc.from("email_send_log").select("status, error_message")
          .eq("message_id", r.provider_ref).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const s = String(ev?.status ?? "");
        if (s === "sent") next = "delivered";
        else if (["dlq", "failed", "bounced", "suppressed", "complained"].includes(s)) { next = "failed"; err = ev?.error_message ?? s; }
      }
      if (next) {
        const patch: any = { status: next, error_message: err };
        if (next === "delivered") patch.delivered_at = new Date().toISOString();
        await svc.from("appointment_contractor_notifications").update(patch).eq("id", r.id);
        Object.assign(r, patch);
      }
    }
    const count = (k: string, v: any) => (rows ?? []).filter((r: any) => r[k] === v).length;
    return json({
      ok: true,
      summary: {
        total: rows?.length ?? 0,
        sent: (rows ?? []).filter((r: any) => ["sent", "delivered"].includes(r.status)).length,
        delivered: count("status", "delivered"),
        failed: count("status", "failed"),
        clicked: (rows ?? []).filter((r: any) => r.first_clicked_at).length,
        accepted: count("response", "accepted"),
        proposed: count("response", "proposed"),
        declined: count("response", "declined"),
      },
      rows,
    });
  }

  if (mode !== "preview" && mode !== "send") return json({ ok: false, error: "invalid_mode" }, 400);
  const pairs: Pair[] = Array.isArray(body?.targets) ? body.targets : [];
  const allowSms = body?.allow_sms === true;
  if (pairs.length === 0) return json({ ok: false, error: "targets_required" }, 400);
  if (pairs.length > MAX_BATCH) return json({ ok: false, error: `max_${MAX_BATCH}_per_batch` }, 400);

  // Resolve recipients.
  const recipients: any[] = [];
  for (const p of pairs) {
    const { data: appt } = await svc.from("appointments")
      .select("id, contractor_id, project_category, problem_summary, preferred_date, preferred_time_window, status")
      .eq("id", p.appointment_id).maybeSingle();
    if (!appt) { recipients.push({ ...p, eligible: false, reason: "appointment_not_found" }); continue; }
    if (appt.status === "archived_test") { recipients.push({ ...p, eligible: false, reason: "qa_test_archived" }); continue; }
    const cid = p.contractor_id ?? appt.contractor_id;
    if (!cid) { recipients.push({ ...p, eligible: false, reason: "no_contractor" }); continue; }
    const { data: c } = await svc.from("contractors")
      .select("id, business_name, email, phone, city, user_id").eq("id", cid).maybeSingle();
    if (!c) { recipients.push({ ...p, eligible: false, reason: "contractor_not_found" }); continue; }
    const email = (c.email ?? "").trim();
    const phone = (c.phone ?? "").trim();
    const channel: Channel | null = email.includes("@") ? "email" : (allowSms && phone ? "sms" : null);
    const ctx = {
      project: appt.problem_summary || appt.project_category || "Projet résidentiel",
      city: c.city ?? "",
      date: appt.preferred_date ?? "",
      window: appt.preferred_time_window ?? "",
    };
    recipients.push({
      appointment_id: appt.id, contractor_id: c.id, business_name: c.business_name,
      user_id: c.user_id, channel, email, phone, ctx,
      recipient_masked: channel === "email" ? maskEmail(email) : channel === "sms" ? maskPhone(phone) : null,
      eligible: !!channel, reason: channel ? null : (allowSms ? "no_email_no_phone" : "no_email_sms_not_allowed"),
    });
  }
  const eligible = recipients.filter((r) => r.eligible);
  const previewHash = await sha(eligible.map((r) => `${r.appointment_id}:${r.contractor_id}:${r.channel}`).sort().join("|"));

  const exampleLinks = { accept: `${SITE}/rdv/<lien-unique-accepter>`, propose: `${SITE}/rdv/<lien-unique-plages>`, decline: `${SITE}/rdv/<lien-unique-refuser>` };
  const publicRecipients = recipients.map(({ email: _e, phone: _p, user_id: _u, ...r }) => ({
    ...r,
    exact_message: r.channel === "sms"
      ? smsBody(r.ctx, exampleLinks)
      : r.channel === "email"
        ? { subject: "Nouvelle demande de rendez-vous UNPRO", body: `Bonjour ${r.business_name ?? "entrepreneur"}, un propriétaire souhaite vous rencontrer. Cette demande vous est réservée : elle n'est pas partagée avec d'autres entrepreneurs. Projet : ${r.ctx.project}${r.ctx.city ? ` · Ville : ${r.ctx.city}` : ""}${r.ctx.date ? ` · Date souhaitée : ${r.ctx.date}` : ""}${r.ctx.window ? ` · Plage : ${r.ctx.window}` : ""}. Boutons : [Accepter] [Proposer d'autres plages] [Refuser]. Ces liens sont personnels et expirent dans 7 jours.` }
        : null,
  }));

  if (mode === "preview") {
    return json({ ok: true, mode, sent: 0, preview_hash: previewHash, eligible: eligible.length, recipients: publicRecipients });
  }

  // SEND — explicit confirmation and identical recipient set required.
  if (body?.confirm !== "ENVOYER") return json({ ok: false, error: "confirmation_required" }, 400);
  if (body?.preview_hash !== previewHash) return json({ ok: false, error: "recipients_changed_rerun_preview" }, 409);
  if (eligible.length === 0) return json({ ok: false, error: "no_eligible_recipient" }, 400);

  const batchId = crypto.randomUUID();
  const results: any[] = [];
  for (const r of eligible) {
    const { data: existing } = await svc.from("appointment_contractor_notifications")
      .select("id, status").eq("appointment_id", r.appointment_id).eq("contractor_id", r.contractor_id).eq("channel", r.channel).maybeSingle();
    if (existing && existing.status !== "pending" && existing.status !== "failed") {
      results.push({ contractor_id: r.contractor_id, skipped: "already_sent" }); continue;
    }
    const { data: notif, error: nErr } = existing
      ? { data: existing, error: null }
      : await svc.from("appointment_contractor_notifications").insert({
          appointment_id: r.appointment_id, contractor_id: r.contractor_id, channel: r.channel,
          recipient_masked: r.recipient_masked, batch_id: batchId, sent_by: caller.userId,
        }).select("id").single();
    if (nErr || !notif) { results.push({ contractor_id: r.contractor_id, error: nErr?.message ?? "insert_failed" }); continue; }

    await svc.from("appointment_action_tokens").delete().eq("notification_id", notif.id);
    const links: Record<string, string> = {};
    for (const action of ["accept", "propose", "decline"] as const) {
      const t = randToken();
      await svc.from("appointment_action_tokens").insert({ notification_id: notif.id, action, token_hash: await sha(t) });
      links[action] = `${SITE}/rdv/${t}`;
    }

    let status = "failed"; let ref: string | null = null; let err: string | null = null;
    if (r.channel === "email") {
      const messageId = crypto.randomUUID();
      const res = await fetch(`${URL_}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SRK}` },
        body: JSON.stringify({
          templateName: "contractor-appointment-request",
          recipientEmail: r.email,
          messageId,
          idempotencyKey: `appt-notify-${notif.id}-${batchId}`,
          templateData: {
            contractorName: r.business_name, projectLabel: r.ctx.project, city: r.ctx.city,
            preferredDate: r.ctx.date, timeWindow: r.ctx.window,
            acceptUrl: links.accept, proposeUrl: links.propose, declineUrl: links.decline,
          },
        }),
      });
      const out = await res.json().catch(() => null);
      if (res.ok) { status = "sent"; ref = messageId; } else err = out?.error ?? `http_${res.status}`;
    } else {
      const s = await sendSms({
        to: r.phone, body: smsBody(r.ctx, links), message_type: "transactional",
        template_key: "contractor_appointment_request", contractor_id: r.contractor_id,
        metadata: { notification_id: notif.id, appointment_id: r.appointment_id, batch_id: batchId },
      });
      ref = s.event_id || null;
      if (s.twilio_sid) status = "sent"; else err = s.error_message ?? s.status;
    }
    await svc.from("appointment_contractor_notifications").update({
      status, provider_ref: ref, error_message: err, batch_id: batchId,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    }).eq("id", notif.id);

    // Keep the existing in-app notification.
    if (r.user_id) {
      const { data: prof } = await svc.from("profiles").select("id").eq("user_id", r.user_id).maybeSingle();
      if (prof?.id) {
        await svc.from("notifications").insert({
          profile_id: prof.id, type: "appointment_request", title: "Nouvelle demande de rendez-vous",
          body: `${r.ctx.project}${r.ctx.city ? ` — ${r.ctx.city}` : ""}`, channel: "in_app", status: "pending",
          entity_type: "appointment", entity_id: r.appointment_id,
          metadata: { notification_id: notif.id },
        });
      }
    }
    results.push({ contractor_id: r.contractor_id, channel: r.channel, status, provider_ref: ref, error: err });
  }
  return json({ ok: true, mode, batch_id: batchId, sent: results.filter((x) => x.status === "sent").length, results });
});
