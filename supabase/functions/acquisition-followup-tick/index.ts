/**
 * acquisition-followup-tick — every 5 min.
 * Sends scheduled emails (the +10 min follow-up after SMS).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { reportOutcome, FailureCode, BlockReason } from "../_shared/reliability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DAILY_EMAIL_CAP = 100;
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
const businessName = (l: any) => l.company_name || l.full_name || "votre entreprise";
const link = (token: string) => `${APP_ORIGIN}/pro/onboarding/${token}`;

function subjectFor(lead: any) {
  return `${businessName(lead)} peut maintenant être recommandé par UNPRO`;
}
function htmlFor(lead: any, l: string) {
  const fn = firstName(lead);
  const company = businessName(lead);
  return `
<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:560px;margin:0 auto;padding:24px;">
  <p>Bonjour ${fn},</p>
  <p>UNPRO aide les propriétaires à trouver le bon entrepreneur selon leur projet, leur secteur, leur budget et leur niveau d'urgence.</p>
  <p><strong>${company}</strong> a été identifiée comme potentiellement admissible.</p>
  <p>Contrairement aux plateformes de leads partagés, UNPRO fonctionne avec des rendez-vous exclusifs garantis.</p>
  <p>Votre profil privé est prêt ici:<br/>
    <a href="${l}" style="color:#0a66ff;font-weight:600;">${l}</a>
  </p>
  <p>Vous pouvez le vérifier, compléter vos informations et activer votre plan.</p>
  <p>— UNPRO</p>
</div>`.trim();
}
function textFor(lead: any, l: string) {
  const fn = firstName(lead);
  const company = businessName(lead);
  return `Bonjour ${fn},\n\nUNPRO aide les propriétaires à trouver le bon entrepreneur selon leur projet, leur secteur, leur budget et leur niveau d'urgence.\n\n${company} a été identifiée comme potentiellement admissible.\n\nContrairement aux plateformes de leads partagés, UNPRO fonctionne avec des rendez-vous exclusifs garantis.\n\nVotre profil privé est prêt ici:\n${l}\n\nVous pouvez le vérifier, compléter vos informations et activer votre plan.\n\n— UNPRO`;
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableKey || !resendKey) return { ok: false, error: "MISSING_SECRET" } as const;
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
  if (!r.ok) return { ok: false, error: data?.message ?? `HTTP ${r.status}`, raw: data } as const;
  return { ok: true, id: data?.id, raw: data } as const;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = admin();

  const nowIso = new Date().toISOString();
  const { data: due } = await sb
    .from("acquisition_followup_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", nowIso)
    .limit(30);

  // Quota check
  const since = new Date(); since.setUTCHours(0,0,0,0);
  const { count: sentToday } = await sb
    .from("contractor_outreach_logs")
    .select("id", { count: "exact", head: true })
    .eq("channel", "email")
    .eq("status", "sent")
    .gte("sent_at", since.toISOString());
  let emailToday = sentToday ?? 0;

  let sent = 0, failed = 0, blocked = 0;

  for (const row of due ?? []) {
    if (emailToday >= DAILY_EMAIL_CAP) { blocked++; continue; }
    if (row.channel !== "email") {
      await sb.from("acquisition_followup_queue").update({ status: "skipped", error_message: "unsupported channel" }).eq("id", row.id);
      continue;
    }
    const { data: lead } = await sb
      .from("contractor_leads").select("*").eq("id", row.lead_id).maybeSingle();
    if (!lead || !lead.email) {
      await sb.from("acquisition_followup_queue").update({ status: "skipped", error_message: "no email on lead" }).eq("id", row.id);
      continue;
    }
    const l = link(lead.onboarding_token || lead.id);
    const r = await sendEmail(lead.email, subjectFor(lead), htmlFor(lead, l), textFor(lead, l));
    await sb.from("contractor_outreach_logs").insert({
      lead_id: lead.id,
      contractor_id: lead.contractor_id,
      channel: "email",
      template_key: "autopilot_followup_v1",
      to_address: lead.email,
      message_subject: subjectFor(lead),
      message_body: textFor(lead, l),
      status: r.ok ? "sent" : "failed",
      provider_response: r.raw ?? null,
      error_code: r.ok ? null : "RESEND_PROVIDER_ERROR",
      error_message: r.ok ? null : (r as any).error,
    });
    if (r.ok) {
      sent++; emailToday++;
      await sb.from("acquisition_followup_queue").update({
        status: "sent", sent_at: new Date().toISOString(),
      }).eq("id", row.id);
      await sb.from("contractor_leads").update({
        pipeline_status: "email_sent",
        last_email_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", lead.id);
    } else {
      failed++;
      await sb.from("acquisition_followup_queue").update({
        status: "failed", error_message: (r as any).error,
      }).eq("id", row.id);
    }
  }

  await reportOutcome({
    operation: "acquisition.autopilot.followup",
    outcome: sent > 0 ? "achieved" : (blocked > 0 ? "blocked" : (failed > 0 ? "partial" : "blocked")),
    block_reason: blocked > 0 ? BlockReason.EMAIL_QUOTA_REACHED : (due?.length === 0 ? BlockReason.LAUNCH_IDLE : null),
    failure_code: failed > 0 ? FailureCode.RESEND_PROVIDER_ERROR : null,
    payload: { due: due?.length ?? 0, sent, failed, blocked, email_today_total: emailToday },
  });

  return new Response(JSON.stringify({ ok: true, sent, failed, blocked, due: due?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
