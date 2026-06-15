/**
 * launch-followup-engine — runs every 15 min via pg_cron.
 * Sends scheduled follow-ups (J+2/J+5/J+10) to MESSAGED/DELIVERED leads with no reply.
 */
import { corsHeaders, adminClient, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, FailureCode, BlockReason } from "../_shared/reliability.ts";
import { sendSms as sendSmsCanonical } from "../_shared/twilioSend.ts";

const FOLLOWUPS = [
  (n: string, c: string) => `${n}, juste un suivi : votre concurrence à ${c} apparaît déjà dans ChatGPT. Voulez-vous voir votre score AI gratuit?`,
  (n: string, c: string) => `${n}, dernière fenêtre cette semaine pour réserver votre territoire UNPRO à ${c}. Réponse OUI pour le lien.`,
  (n: string, c: string) => `${n}, on libère votre place territoire à ${c} dans 24h. OUI = je vous l'envoie, NON = je ferme votre dossier.`,
];

async function sendSms(to: string, body: string, lead_id?: string, attempt?: number): Promise<boolean> {
  const r = await sendSmsCanonical({ to, body, message_type: "reengagement", template_key: `launch_followup_${attempt ?? 1}`, lead_id, attempt_number: attempt });
  return r.status === "sending" || r.status === "queued";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = adminClient();
  const now = new Date().toISOString();

  const { data: due } = await sb
    .from("launch_followup_schedule")
    .select("*, launch_leads!inner(*)")
    .is("sent_at", null)
    .lte("due_at", now)
    .limit(50);

  let sent = 0, skipped = 0;
  for (const row of due ?? []) {
    const lead = (row as any).launch_leads;
    if (!lead || !["MESSAGED", "DELIVERED"].includes(lead.lead_status)) {
      await sb.from("launch_followup_schedule").update({
        sent_at: now, skipped_reason: `state=${lead?.lead_status ?? "unknown"}`,
      }).eq("id", (row as any).id);
      skipped++;
      continue;
    }
    const tpl = FOLLOWUPS[((row as any).attempt_number ?? 1) - 1] ?? FOLLOWUPS[0];
    const msg = tpl((lead.company_name ?? "").split(/\s+/)[0] || "Bonjour", lead.city ?? "votre région");
    const ok = await sendSms(lead.phone, msg, lead.id, (row as any).attempt_number ?? 1);
    await sb.from("launch_followup_schedule").update({
      sent_at: now, skipped_reason: ok ? null : "send_failed",
    }).eq("id", (row as any).id);
    await logLaunchEvent({
      lead_id: lead.id, agent: "launch-followup-engine",
      event: `followup_${(row as any).attempt_number}`,
      success: ok, message: ok ? msg : "send_failed",
    });
    if (ok) sent++; else skipped++;
  }

  await reportOutcome({
    operation: "launch.followup.run",
    outcome: sent > 0 ? "achieved" : "partial",
    block_reason: sent === 0 && skipped > 0 ? BlockReason.FOLLOWUP_MAX_ATTEMPTS : null,
    payload: { sent, skipped, due: due?.length ?? 0 },
  });

  return new Response(JSON.stringify({ ok: true, sent, skipped }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
