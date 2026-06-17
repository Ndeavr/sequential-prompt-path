// UNPRO Smart Contact Router — picks SMS vs email, falls back, logs everything.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

type Channel = "sms" | "email";

interface Body {
  contact_id?: string;
  contact?: {
    first_name?: string; last_name?: string;
    email?: string; phone?: string;
    sms_consent?: boolean; email_consent?: boolean;
  };
  template_key: string;
  template_data?: Record<string, unknown>;
  sms_body?: string;          // raw SMS body (if no transactional template registered)
  email_subject?: string;
  email_html?: string;
  channel_override?: Channel;
  idempotency_key?: string;
}

function normalizeE164(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+\d{10,15}$/.test(digits)) return digits;
  const only = digits.replace(/\D/g, "");
  if (only.length === 10) return `+1${only}`;
  if (only.length === 11 && only.startsWith("1")) return `+${only}`;
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(SUPA_URL, SRK, { auth: { autoRefreshToken: false, persistSession: false } });

    const body = (await req.json()) as Body;
    if (!body.template_key) return json({ error: "template_key required" }, 400);

    // ── 1. Resolve / upsert contact ──
    let contactId = body.contact_id;
    let contact: any = null;

    if (contactId) {
      const { data } = await supa.from("contacts").select("*").eq("id", contactId).maybeSingle();
      contact = data;
    }
    if (!contact && body.contact) {
      const e164 = normalizeE164(body.contact.phone);
      // Try existing by phone or email
      if (e164) {
        const { data } = await supa.from("contacts").select("*").eq("phone_e164", e164).maybeSingle();
        contact = data;
      }
      if (!contact && body.contact.email) {
        const { data } = await supa.from("contacts").select("*").eq("email", body.contact.email.toLowerCase()).maybeSingle();
        contact = data;
      }
      if (!contact) {
        const { data, error } = await supa.from("contacts").insert({
          first_name: body.contact.first_name ?? null,
          last_name: body.contact.last_name ?? null,
          email: body.contact.email?.toLowerCase() ?? null,
          phone: body.contact.phone ?? null,
          phone_e164: e164,
          sms_consent: body.contact.sms_consent ?? false,
          email_consent: body.contact.email_consent ?? true,
        }).select("*").single();
        if (error) return json({ error: "contact_create_failed", details: error.message }, 500);
        contact = data;
      }
      contactId = contact.id;
    }
    if (!contact) return json({ error: "No contact_id or contact payload provided" }, 400);

    // ── 2. Lookup phone if needed ──
    if (contact.phone_e164 || normalizeE164(contact.phone)) {
      const stale = !contact.lookup_cached_at ||
        (Date.now() - new Date(contact.lookup_cached_at).getTime()) > 90 * 86400000;
      if (stale) {
        try {
          const r = await fetch(`${SUPA_URL}/functions/v1/twilio-lookup-phone`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SRK}` },
            body: JSON.stringify({ phone: contact.phone_e164 || contact.phone, contact_id: contact.id }),
          });
          const lookup = await r.json();
          if (lookup?.phone_type) {
            contact.phone_type = lookup.phone_type;
            contact.phone_verified = lookup.phone_verified;
            contact.phone_e164 = lookup.phone_e164 ?? contact.phone_e164;
          }
        } catch { /* non-blocking */ }
      }
    }

    // ── 3. Pick rule & channel ──
    const { data: rules } = await supa.from("outbound_contact_rules")
      .select("*").eq("is_active", true).order("priority", { ascending: true });

    const matchRule = (r: any): boolean => {
      switch (r.condition_type) {
        case "phone_is_mobile": return contact.phone_type === "mobile" && contact.phone_verified === true && contact.sms_consent === true;
        case "phone_is_landline": return contact.phone_type === "landline";
        case "phone_is_voip": return contact.phone_type === "voip";
        case "phone_unknown": return !contact.phone_type || contact.phone_type === "unknown" || !contact.phone_verified;
        case "always": return true;
        default: return false;
      }
    };
    const rule = (rules || []).find(matchRule) ?? {
      rule_name: "default_email", primary_channel: "email", fallback_channel: null, delay_before_fallback_minutes: 0,
    };

    let primary: Channel = body.channel_override ?? (rule.primary_channel as Channel);
    let fallback: Channel | null = rule.fallback_channel as Channel | null;
    let landlineBlocked = false;

    // 🚫 HARD BLOCK — never send SMS to landlines. Auto-cascade to email or manual call.
    const isLandlineLike = contact.phone_type === "landline" || contact.phone_type === "fixedVoip";
    if (isLandlineLike && primary === "sms") {
      landlineBlocked = true;
      primary = contact.email ? "email" : "email"; // forced email, will fail-soft below if no email
    }
    if (isLandlineLike && fallback === "sms") fallback = null;

    // hard overrides
    if (primary === "sms" && (!contact.phone_e164 || !contact.sms_consent)) primary = "email";
    if (primary === "email" && !contact.email && contact.phone_e164 && contact.sms_consent && !isLandlineLike) primary = "sms";
    if (fallback === "sms" && (!contact.phone_e164 || !contact.sms_consent)) fallback = null;
    if (fallback === "email" && !contact.email) fallback = null;
    if (primary === fallback) fallback = null;

    // If landline + no email → route to manual-call queue and stop.
    if (landlineBlocked && !contact.email) {
      await supa.from("communication_logs").insert({
        contact_id: contact.id, channel: "sms", template_key: body.template_key,
        delivery_status: "blocked",
        error_message: "landline_no_email_manual_call_required",
        channel_decision_reason: "landline_sms_blocked",
        fallback_chain: [{ blocked: "sms", reason: "landline", queued: "manual_call" }],
        idempotency_key: body.idempotency_key ?? null,
      });
      // Mark in verification queue if a row exists for this contact's phone
      if (contact.phone_e164) {
        await supa.from("contact_verification_queue").update({
          verification_status: "needs_manual_review",
          best_contact_method: "phone_call",
          notes: "Auto-routed: landline detected, no email on file. Call manually.",
        }).eq("phone", contact.phone_e164).neq("verification_status", "contacted");
      }
      return json({ ok: false, reason: "landline_no_email_manual_call", phone_type: contact.phone_type });
    }

    const canSendPrimary =
      (primary === "sms" && contact.phone_e164 && contact.sms_consent) ||
      (primary === "email" && contact.email && contact.email_consent);

    if (!canSendPrimary) {
      const { data: logRow } = await supa.from("communication_logs").insert({
        contact_id: contact.id, channel: primary, template_key: body.template_key,
        delivery_status: "failed", error_message: "No eligible channel (missing destination or consent)",
        idempotency_key: body.idempotency_key ?? null,
      }).select().single();
      return json({ ok: false, reason: "no_eligible_channel", log_id: logRow?.id });
    }

    // ── 4. Idempotency check ──
    if (body.idempotency_key) {
      const { data: existing } = await supa.from("communication_logs")
        .select("id,delivery_status").eq("contact_id", contact.id)
        .eq("template_key", body.template_key).eq("idempotency_key", body.idempotency_key)
        .maybeSingle();
      if (existing) return json({ ok: true, duplicate: true, log_id: existing.id, status: existing.delivery_status });
    }

    // ── 5. Send primary ──
    const sendResult = await dispatch(supa, primary, contact, body);

    const { data: log } = await supa.from("communication_logs").insert({
      contact_id: contact.id,
      channel: primary,
      template_key: body.template_key,
      delivery_status: sendResult.ok ? "sent" : "failed",
      provider: sendResult.provider,
      provider_message_id: sendResult.providerMessageId ?? null,
      error_message: sendResult.error ?? null,
      idempotency_key: body.idempotency_key ?? null,
      sent_at: sendResult.ok ? new Date().toISOString() : null,
      payload: { rule: rule.rule_name },
    }).select().single();

    await supa.from("contacts").update({ last_channel_used: primary }).eq("id", contact.id);

    // ── 6. Schedule fallback if applicable ──
    let fallbackQueued = false;
    if (sendResult.ok && primary === "sms" && fallback === "email" && contact.email) {
      const when = new Date(Date.now() + (rule.delay_before_fallback_minutes ?? 60) * 60000).toISOString();
      await supa.from("communication_fallback_queue").insert({
        contact_id: contact.id, parent_log_id: log!.id,
        fallback_channel: "email", template_key: body.template_key,
        scheduled_for: when,
        payload: { sms_body: body.sms_body, email_subject: body.email_subject, email_html: body.email_html, template_data: body.template_data },
      });
      fallbackQueued = true;
    }

    // immediate fallback if primary failed
    if (!sendResult.ok && fallback && fallback !== primary) {
      const r2 = await dispatch(supa, fallback, contact, body);
      await supa.from("communication_logs").insert({
        contact_id: contact.id, channel: fallback, template_key: body.template_key,
        delivery_status: r2.ok ? "sent" : "failed",
        provider: r2.provider, provider_message_id: r2.providerMessageId ?? null,
        error_message: r2.error ?? null,
        fallback_triggered: true, parent_log_id: log?.id ?? null,
        sent_at: r2.ok ? new Date().toISOString() : null,
        payload: { reason: "primary_failed", primary_error: sendResult.error },
      });
      return json({ ok: r2.ok, channel_used: fallback, fallback_used: true, log_id: log?.id });
    }

    return json({
      ok: sendResult.ok,
      channel_used: primary,
      log_id: log?.id,
      fallback_scheduled: fallbackQueued,
      phone_type: contact.phone_type ?? null,
      phone_verified: contact.phone_verified ?? null,
      rule: rule.rule_name,
      error: sendResult.error ?? null,
    });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

// ──────────────── DISPATCH ────────────────
async function dispatch(supa: any, channel: Channel, contact: any, body: Body):
  Promise<{ ok: boolean; provider: string; providerMessageId?: string; error?: string }> {
  if (channel === "sms") return sendSms(contact, body);
  return sendEmail(supa, contact, body);
}

async function sendSms(contact: any, body: Body) {
  const { sendSms: sendSmsCanonical } = await import("../_shared/twilioSend.ts");
  const text = body.sms_body ?? defaultSms(body.template_key, contact, body.template_data);
  const r = await sendSmsCanonical({
    to: contact.phone_e164,
    body: text,
    message_type: "outreach",
    template_key: body.template_key,
    contractor_id: contact.contractor_id ?? undefined,
  });
  const ok = r.status === "sending" || r.status === "queued";
  return ok
    ? { ok: true, provider: "twilio", providerMessageId: r.twilio_sid ?? undefined }
    : { ok: false, provider: "twilio", error: r.error_message ?? r.status };
}

async function sendEmail(supa: any, contact: any, body: Body) {
  // Try Lovable transactional first if a template exists; otherwise generic invoke.
  try {
    const { data, error } = await supa.functions.invoke("send-transactional-email", {
      body: {
        templateName: body.template_key,
        recipientEmail: contact.email,
        idempotencyKey: body.idempotency_key ?? `${contact.id}-${body.template_key}-${Date.now()}`,
        templateData: { ...(body.template_data ?? {}), first_name: contact.first_name },
      },
    });
    if (error) {
      // Fallback: if template not registered, mark as failure (no raw HTML send path yet).
      return { ok: false, provider: "lovable_email", error: error.message ?? "send_failed" };
    }
    return { ok: true, provider: "lovable_email", providerMessageId: (data as any)?.message_id ?? null };
  } catch (e) {
    return { ok: false, provider: "lovable_email", error: String((e as Error).message ?? e) };
  }
}

function defaultSms(_key: string, contact: any, _data?: Record<string, unknown>) {
  const name = contact.first_name || "";
  return `Bonjour ${name}, c'est Alex d'UNPRO. Répondez STOP pour ne plus recevoir nos messages.`;
}
