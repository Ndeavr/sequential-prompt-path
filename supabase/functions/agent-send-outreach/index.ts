/**
 * agent-send-outreach (v2)
 * - Normalizes phone to +1XXXXXXXXXX
 * - Calls Twilio directly so we capture the raw provider response
 * - Falls back to email (Resend) if SMS fails or no valid phone
 * - Logs every attempt in outreach_delivery_logs
 * - Only consumes quota on real success
 */
import { corsHeaders, adminClient } from "../_shared/agentRun.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Channel = "sms" | "email";

function normalizePhoneQc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

async function logDelivery(db: SupabaseClient, row: Record<string, unknown>) {
  try { await db.from("outreach_delivery_logs").insert(row); } catch (_) { /* ignore */ }
}

async function checkQuota(db: SupabaseClient, channel: Channel, scope: string, scopeKey: string, defaultLimit: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db.from("activation_quotas")
    .select("id, used_count, limit_count")
    .eq("scope", scope).eq("scope_key", scopeKey).eq("channel", channel).eq("period_date", today)
    .maybeSingle();
  if (!data) return { ok: true, id: null as string | null, used: 0, limit: defaultLimit };
  return { ok: data.used_count < data.limit_count, id: data.id as string, used: data.used_count, limit: data.limit_count };
}

async function consumeQuota(db: SupabaseClient, channel: Channel, scope: string, scopeKey: string, defaultLimit: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db.from("activation_quotas")
    .select("id, used_count").eq("scope", scope).eq("scope_key", scopeKey).eq("channel", channel).eq("period_date", today)
    .maybeSingle();
  if (!data) {
    await db.from("activation_quotas").insert({
      scope, scope_key: scopeKey, channel, period_date: today,
      limit_count: defaultLimit, used_count: 1, last_used_at: new Date().toISOString(),
    });
  } else {
    await db.from("activation_quotas")
      .update({ used_count: (data.used_count ?? 0) + 1, last_used_at: new Date().toISOString() })
      .eq("id", data.id);
  }
}

async function sendTwilioSms(to: string, body: string): Promise<{ ok: boolean; status: number; sid?: string; code?: string | number; message?: string; raw: unknown }> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const msgSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || (!msgSid && !fromNumber)) {
    return { ok: false, status: 0, code: "missing_secret", message: "Twilio credentials not configured", raw: null };
  }
  const params = new URLSearchParams({ To: to, Body: body });
  if (msgSid) params.set("MessagingServiceSid", msgSid);
  else params.set("From", fromNumber!);
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, sid: data?.sid, code: data?.code, message: data?.message, raw: data };
}

async function sendResendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; status: number; id?: string; message?: string; raw: unknown }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableKey || !resendKey) {
    return { ok: false, status: 0, message: "Resend not configured", raw: null };
  }
  const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: "Alex d'UNPRO <alex@mail.unpro.ca>",
      to: [to],
      subject,
      html,
    }),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, id: data?.id, message: data?.message, raw: data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(body.limit ?? 25, 50);
  const triggeredBy = body.triggered_by ?? "cron";

  const db = adminClient();
  const { data: run } = await db.from("agent_runs")
    .insert({ agent_name: "send-outreach", status: "running", input: { limit }, triggered_by: triggeredBy })
    .select("id").single();
  const runId = run!.id as string;
  const t0 = Date.now();

  const reasons = { missing_secret: 0, invalid_phone: 0, provider_rejected: 0, quota: 0, no_contact: 0, opt_out: 0, cooldown: 0 };
  let sent = 0, failed = 0, blocked = 0, smsSent = 0, emailSent = 0;
  const lastIds: { provider_message_id?: string; channel?: Channel }[] = [];

  try {
    const { data: msgs } = await db.from("agent_outreach_messages")
      .select("id, lead_id, channel, body, subject, variant")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(limit);

    for (const m of msgs ?? []) {
      const { data: lead } = await db.from("contractor_leads")
        .select("id, phone, mobile_phone, email, first_name, company_name, trade, category_primary, city")
        .eq("id", m.lead_id).maybeSingle();

      if (!lead) {
        failed++;
        await db.from("agent_outreach_messages").update({ status: "failed", error: "lead_not_found" }).eq("id", m.id);
        await logDelivery(db, { lead_id: m.lead_id, message_id: m.id, channel: m.channel, status: "failed", error_code: "lead_not_found" });
        continue;
      }

      const rawPhone = lead.mobile_phone || lead.phone;
      const normalized = normalizePhoneQc(rawPhone);
      const wantSms = m.channel === "sms";
      const canSms = !!normalized;
      const canEmail = !!lead.email;

      // Pick channel: sms if asked & valid, else email fallback
      let useChannel: Channel | null = null;
      if (wantSms && canSms) useChannel = "sms";
      else if (canEmail) useChannel = "email";
      else if (canSms) useChannel = "sms";

      if (!useChannel) {
        blocked++; reasons.no_contact++;
        if (!canSms && rawPhone) reasons.invalid_phone++;
        await db.from("agent_outreach_messages").update({
          status: "failed",
          error: JSON.stringify({ code: rawPhone ? "invalid_phone" : "no_contact", phone_raw: rawPhone, email: lead.email }),
        }).eq("id", m.id);
        await logDelivery(db, {
          lead_id: lead.id, message_id: m.id, channel: m.channel,
          status: "blocked", error_code: rawPhone ? "invalid_phone" : "no_contact",
          recipient_raw: rawPhone ?? lead.email, recipient_normalized: normalized,
          message_body: m.body,
        });
        continue;
      }

      // Quota CHECK (no consume yet)
      const limitDefault = useChannel === "sms" ? 50 : 25;
      const q = await checkQuota(db, useChannel, "global", "*", limitDefault);
      if (!q.ok) {
        blocked++; reasons.quota++;
        await logDelivery(db, {
          lead_id: lead.id, message_id: m.id, channel: useChannel,
          status: "blocked", error_code: "quota_exceeded",
          recipient_raw: rawPhone ?? lead.email, recipient_normalized: normalized,
          message_body: m.body, metadata: { used: q.used, limit: q.limit },
        });
        continue;
      }

      // Attempt
      let attempt: Awaited<ReturnType<typeof sendTwilioSms>> | Awaited<ReturnType<typeof sendResendEmail>>;
      let provider = "";
      let recipient = "";
      let providerMessageId: string | undefined;

      if (useChannel === "sms") {
        provider = "twilio";
        recipient = normalized!;
        attempt = await sendTwilioSms(normalized!, m.body);
        providerMessageId = (attempt as any).sid;
      } else {
        provider = "resend";
        recipient = lead.email!;
        const subject = m.subject || `${lead.first_name || lead.company_name || "Bonjour"} — UNPRO`;
        const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.55;color:#0F172A">${m.body.replace(/\n/g, "<br/>")}</div>`;
        attempt = await sendResendEmail(lead.email!, subject, html);
        providerMessageId = (attempt as any).id;
      }

      const errorCode = !attempt.ok
        ? ((attempt as any).code === "missing_secret" ? "missing_secret" : `provider_${attempt.status}`)
        : null;

      await logDelivery(db, {
        lead_id: lead.id, message_id: m.id, channel: useChannel, provider,
        recipient_raw: rawPhone ?? lead.email, recipient_normalized: recipient,
        message_body: m.body,
        status: attempt.ok ? "sent" : "failed",
        error_code: errorCode,
        error_message: attempt.ok ? null : (attempt.message ?? null),
        provider_message_id: providerMessageId ?? null,
        sent_at: attempt.ok ? new Date().toISOString() : null,
        metadata: { http_status: attempt.status, raw: attempt.raw },
      });

      if (attempt.ok) {
        sent++;
        if (useChannel === "sms") smsSent++; else emailSent++;
        lastIds.push({ provider_message_id: providerMessageId, channel: useChannel });
        await consumeQuota(db, useChannel, "global", "*", limitDefault);
        await db.from("agent_outreach_messages").update({
          status: "sent", sent_at: new Date().toISOString(),
          metadata: { provider, provider_message_id: providerMessageId, channel_used: useChannel },
        }).eq("id", m.id);
        await db.from("contractor_leads").update({
          outreach_status: "contacted", lead_status: "contacted",
          last_agent_run_at: new Date().toISOString(),
        }).eq("id", lead.id);
        continue;
      }

      // SMS failed → try email fallback once
      if (useChannel === "sms" && canEmail) {
        const eq = await checkQuota(db, "email", "global", "*", 25);
        if (eq.ok) {
          const subject = `${lead.first_name || lead.company_name || "Bonjour"} — UNPRO`;
          const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.55;color:#0F172A">${m.body.replace(/\n/g, "<br/>")}</div>`;
          const fb = await sendResendEmail(lead.email!, subject, html);
          await logDelivery(db, {
            lead_id: lead.id, message_id: m.id, channel: "email", provider: "resend",
            recipient_raw: lead.email, recipient_normalized: lead.email,
            message_body: m.body, attempt: 2,
            status: fb.ok ? "sent" : "failed",
            error_code: fb.ok ? null : `provider_${fb.status}`,
            error_message: fb.ok ? null : (fb.message ?? null),
            provider_message_id: fb.id ?? null,
            sent_at: fb.ok ? new Date().toISOString() : null,
            metadata: { fallback_from: "sms", http_status: fb.status, raw: fb.raw },
          });
          if (fb.ok) {
            sent++; emailSent++;
            lastIds.push({ provider_message_id: fb.id, channel: "email" });
            await consumeQuota(db, "email", "global", "*", 25);
            await db.from("agent_outreach_messages").update({
              status: "sent", sent_at: new Date().toISOString(),
              metadata: { provider: "resend", provider_message_id: fb.id, channel_used: "email", fallback_from: "sms" },
            }).eq("id", m.id);
            await db.from("contractor_leads").update({
              outreach_status: "contacted", lead_status: "contacted",
              last_agent_run_at: new Date().toISOString(),
            }).eq("id", lead.id);
            continue;
          }
        }
      }

      // Final failure
      failed++;
      if ((attempt as any).code === "missing_secret") reasons.missing_secret++;
      else reasons.provider_rejected++;
      await db.from("agent_outreach_messages").update({
        status: "failed",
        error: JSON.stringify({
          provider, recipient,
          http_status: attempt.status,
          provider_code: (attempt as any).code,
          provider_message: attempt.message,
        }),
      }).eq("id", m.id);
    }

    const output = {
      sent, failed, blocked, queue: msgs?.length ?? 0,
      by_channel: { sms_sent: smsSent, email_sent: emailSent },
      reasons,
      last_provider_ids: lastIds.slice(-5),
    };
    const status = sent > 0 ? "ok" : (failed > 0 ? "error" : "ok");
    await db.from("agent_runs").update({
      status, finished_at: new Date().toISOString(), duration_ms: Date.now() - t0, output,
    }).eq("id", runId);

    return new Response(JSON.stringify({ ok: sent > 0 || (msgs?.length ?? 0) === 0, runId, output }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("agent_runs").update({
      status: "error", finished_at: new Date().toISOString(), duration_ms: Date.now() - t0, error: msg,
    }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
