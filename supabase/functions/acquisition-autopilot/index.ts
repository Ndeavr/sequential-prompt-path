/**
 * acquisition-autopilot — every 15 min.
 * Walks contractor_leads from `discovered` → `sms_sent`/`email_sent` automatically.
 * No admin approval. Respects daily caps. Reports outcome.
 */
import { assertSmsHealthy } from "../_shared/smsHealth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { reportOutcome, FailureCode, BlockReason } from "../_shared/reliability.ts";
import { sendSms as sendSmsCanonical } from "../_shared/twilioSend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DAILY_SMS_CAP = 50;
const DAILY_EMAIL_CAP = 100;
const DAILY_ACTIVATION_CAP = 25;

const APP_ORIGIN = Deno.env.get("APP_PUBLIC_URL") ?? "https://unpro.ca";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function firstName(lead: any): string {
  return (
    (lead.first_name && String(lead.first_name).trim()) ||
    (lead.full_name && String(lead.full_name).split(/\s+/)[0]) ||
    (lead.company_name && String(lead.company_name).split(/\s+/)[0]) ||
    "Bonjour"
  );
}

function businessName(lead: any): string {
  return lead.company_name || lead.full_name || "votre entreprise";
}

function buildPrivateLink(token: string): string {
  return `${APP_ORIGIN}/pro/onboarding/${token}`;
}

function buildSms(lead: any, link: string): string {
  return `Bonjour ${firstName(lead)}, UNPRO peut recommander ${businessName(lead)} à des propriétaires qualifiés dans votre secteur. Pas des leads partagés: rendez-vous exclusifs garantis. Activez votre profil ici: ${link}`;
}

function buildEmailSubject(lead: any): string {
  return `${businessName(lead)} peut maintenant être recommandé par UNPRO`;
}

function buildEmailHtml(lead: any, link: string): string {
  const fn = firstName(lead);
  const company = businessName(lead);
  return `
<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:560px;margin:0 auto;padding:24px;">
  <p>Bonjour ${fn},</p>
  <p>UNPRO aide les propriétaires à trouver le bon entrepreneur selon leur projet, leur secteur, leur budget et leur niveau d'urgence.</p>
  <p><strong>${company}</strong> a été identifiée comme potentiellement admissible.</p>
  <p>Contrairement aux plateformes de leads partagés, UNPRO fonctionne avec des rendez-vous exclusifs garantis.</p>
  <p>Votre profil privé est prêt ici:<br/>
    <a href="${link}" style="color:#0a66ff;font-weight:600;">${link}</a>
  </p>
  <p>Vous pouvez le vérifier, compléter vos informations et activer votre plan.</p>
  <p>— UNPRO</p>
</div>`.trim();
}

function buildEmailText(lead: any, link: string): string {
  const fn = firstName(lead);
  const company = businessName(lead);
  return [
    `Bonjour ${fn},`,
    ``,
    `UNPRO aide les propriétaires à trouver le bon entrepreneur selon leur projet, leur secteur, leur budget et leur niveau d'urgence.`,
    ``,
    `${company} a été identifiée comme potentiellement admissible.`,
    ``,
    `Contrairement aux plateformes de leads partagés, UNPRO fonctionne avec des rendez-vous exclusifs garantis.`,
    ``,
    `Votre profil privé est prêt ici:`,
    link,
    ``,
    `Vous pouvez le vérifier, compléter vos informations et activer votre plan.`,
    ``,
    `— UNPRO`,
  ].join("\n");
}

function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function ensureToken(existing?: string | null): string {
  if (existing && existing.length >= 16) return existing;
  return crypto.randomUUID().replace(/-/g, "");
}

function fitScore(lead: any): { score: number; reasons: string[] } {
  let score = 50;
  const reasons: string[] = [];
  if (lead.website_url) { score += 8; reasons.push("Site web actif"); }
  if (lead.email) { score += 6; reasons.push("Adresse courriel disponible"); }
  if (lead.phone || lead.mobile_phone) { score += 6; reasons.push("Téléphone disponible"); }
  if (lead.category_primary || lead.trade) { score += 10; reasons.push(`Spécialité identifiée: ${lead.category_primary || lead.trade}`); }
  if (lead.city) { score += 6; reasons.push(`Présent à ${lead.city}`); }
  if (lead.ai_visibility_score && Number(lead.ai_visibility_score) < 60) {
    score += 10;
    reasons.push("Faible visibilité IA — gain rapide possible");
  }
  if (lead.metadata_json?.rbq || lead.metadata_json?.neq) {
    score += 4;
    reasons.push("RBQ/NEQ détecté");
  }
  return { score: Math.min(99, score), reasons: reasons.slice(0, 5) };
}

async function sendSms(to: string, body: string, lead_id?: string, contractor_id?: string): Promise<{ ok: boolean; sid?: string; error?: string; raw?: unknown }> {
  const r = await sendSmsCanonical({ to, body, message_type: "outreach", template_key: "autopilot_invite_v1", lead_id, contractor_id });
  const ok = r.status === "sending" || r.status === "queued";
  return { ok, sid: r.twilio_sid ?? undefined, error: ok ? undefined : (r.error_message ?? r.status), raw: r };
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<{ ok: boolean; id?: string; error?: string; raw?: unknown }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableKey || !resendKey) return { ok: false, error: "MISSING_SECRET" };
  const from = Deno.env.get("OUTBOUND_FROM_EMAIL") ?? "UNPRO <bonjour@notify.unpro.ca>";
  const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: data?.message ?? `HTTP ${r.status}`, raw: data };
  return { ok: true, id: data?.id, raw: data };
}

async function countToday(sb: ReturnType<typeof admin>, channel: "sms" | "email"): Promise<number> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await sb
    .from("contractor_outreach_logs")
    .select("id", { count: "exact", head: true })
    .eq("channel", channel)
    .eq("status", "sent")
    .gte("sent_at", since.toISOString());
  return count ?? 0;
}

async function countActivationsToday(sb: ReturnType<typeof admin>): Promise<number> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await sb
    .from("contractor_leads")
    .select("id", { count: "exact", head: true })
    .gte("updated_at", since.toISOString())
    .in("pipeline_status", ["sms_sent", "email_sent", "message_ready"]);
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const __health = await assertSmsHealthy();
  if (!__health.ok) return new Response(JSON.stringify({ ok: false, blocked: true, reason: __health.reason, health: __health.health }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const sb = admin();
  const startedAt = Date.now();
  const batch = 25;

  // Pick eligible leads: anything not yet messaged or failed
  const { data: leads, error } = await sb
    .from("contractor_leads")
    .select("*")
    .in("pipeline_status", ["discovered", "enriched", "scored", "message_ready"])
    .order("created_at", { ascending: true })
    .limit(batch);

  if (error) {
    await reportOutcome({
      operation: "acquisition.autopilot.run",
      outcome: "failed",
      failure_code: FailureCode.SUPABASE_TIMEOUT,
      payload: { error: error.message },
    });
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let smsSentToday = await countToday(sb, "sms");
  let emailSentToday = await countToday(sb, "email");
  const activationsToday = await countActivationsToday(sb);

  let smsSent = 0;
  let emailSent = 0;
  let scheduledFollowups = 0;
  let failed = 0;
  let missingContact = 0;
  let quotaBlocked = 0;
  let processed = 0;
  const errors: string[] = [];

  for (const lead of leads ?? []) {
    if (activationsToday + processed >= DAILY_ACTIVATION_CAP) break;
    processed++;

    const phone = normalizePhone(lead.phone ?? lead.mobile_phone);
    const email = lead.email && /\S+@\S+\.\S+/.test(lead.email) ? lead.email : null;

    if (!phone && !email) {
      missingContact++;
      await sb.from("contractor_leads").update({
        pipeline_status: "failed",
        failure_code: "MISSING_CONTACT",
        updated_at: new Date().toISOString(),
      }).eq("id", lead.id);
      continue;
    }

    // Score + token
    const { score, reasons } = fitScore(lead);
    const token = ensureToken(lead.onboarding_token);
    const link = buildPrivateLink(token);

    await sb.from("contractor_leads").update({
      pipeline_status: "message_ready",
      onboarding_token: token,
      fit_score: score,
      fit_reasons: reasons,
      recommended_plan_slug: lead.recommended_plan_slug ?? "fondateur-149",
      updated_at: new Date().toISOString(),
    }).eq("id", lead.id);

    let smsDone = false;
    let emailDone = false;

    // 1) SMS first if phone exists
    if (phone) {
      if (smsSentToday >= DAILY_SMS_CAP) {
        quotaBlocked++;
      } else {
        const body = buildSms(lead, link);
        const r = await sendSms(phone, body, lead.id, lead.contractor_id);
        await sb.from("contractor_outreach_logs").insert({
          lead_id: lead.id,
          contractor_id: lead.contractor_id,
          channel: "sms",
          template_key: "autopilot_invite_v1",
          to_address: phone,
          message_body: body,
          status: r.ok ? "sent" : "failed",
          provider_response: r.raw ?? null,
          error_code: r.ok ? null : "TWILIO_PROVIDER_ERROR",
          error_message: r.ok ? null : r.error,
        });
        if (r.ok) {
          smsSent++; smsSentToday++; smsDone = true;
          await sb.from("contractor_leads").update({
            pipeline_status: "sms_sent",
            last_sms_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", lead.id);
        } else {
          failed++;
          errors.push(`sms:${r.error}`);
        }
      }
    }

    // 2) Email — if SMS was sent and email exists, schedule for +10 min; else send now if email exists
    if (email) {
      if (smsDone && phone) {
        const dueAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await sb.from("acquisition_followup_queue").insert({
          lead_id: lead.id,
          channel: "email",
          scheduled_at: dueAt,
        });
        scheduledFollowups++;
      } else {
        if (emailSentToday >= DAILY_EMAIL_CAP) {
          quotaBlocked++;
        } else {
          const subject = buildEmailSubject(lead);
          const html = buildEmailHtml(lead, link);
          const text = buildEmailText(lead, link);
          const r = await sendEmail(email, subject, html, text);
          await sb.from("contractor_outreach_logs").insert({
            lead_id: lead.id,
            contractor_id: lead.contractor_id,
            channel: "email",
            template_key: "autopilot_invite_v1",
            to_address: email,
            message_subject: subject,
            message_body: text,
            status: r.ok ? "sent" : "failed",
            provider_response: r.raw ?? null,
            error_code: r.ok ? null : "RESEND_PROVIDER_ERROR",
            error_message: r.ok ? null : r.error,
          });
          if (r.ok) {
            emailSent++; emailSentToday++; emailDone = true;
            await sb.from("contractor_leads").update({
              pipeline_status: smsDone ? "sms_sent" : "email_sent",
              last_email_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", lead.id);
          } else {
            failed++;
            errors.push(`email:${r.error}`);
          }
        }
      }
    }

    // Nothing happened at all (quota blocked both) → leave as message_ready, will retry next tick
  }

  const totalSent = smsSent + emailSent;
  await reportOutcome({
    operation: "acquisition.autopilot.run",
    outcome: totalSent > 0
      ? "achieved"
      : (quotaBlocked > 0
        ? "blocked"
        : (missingContact > 0 || failed > 0 ? "partial" : "blocked")),
    block_reason: quotaBlocked > 0
      ? (smsSentToday >= DAILY_SMS_CAP ? BlockReason.SMS_QUOTA_REACHED : BlockReason.EMAIL_QUOTA_REACHED)
      : ((leads ?? []).length === 0 ? BlockReason.LAUNCH_IDLE : null),
    failure_code: failed > 0 ? FailureCode.TWILIO_PROVIDER_ERROR : null,
    payload: {
      considered: leads?.length ?? 0,
      processed,
      sms_sent: smsSent,
      email_sent: emailSent,
      scheduled_followups: scheduledFollowups,
      missing_contact: missingContact,
      quota_blocked: quotaBlocked,
      failed,
      sms_today_total: smsSentToday,
      email_today_total: emailSentToday,
      sample_errors: errors.slice(0, 5),
      duration_ms: Date.now() - startedAt,
    },
  });

  return new Response(JSON.stringify({
    ok: true,
    considered: leads?.length ?? 0,
    sms_sent: smsSent,
    email_sent: emailSent,
    scheduled_followups: scheduledFollowups,
    missing_contact: missingContact,
    quota_blocked: quotaBlocked,
    failed,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
