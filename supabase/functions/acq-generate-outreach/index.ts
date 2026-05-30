// acq-generate-outreach — creates draft email + SMS messages referencing real AIPP gaps
import { svc, startRun, finishRun, log, cors } from "../_shared/acq-logger.ts";

const PUBLIC_BASE = "https://unpro.ca";

function buildEmail(p: any, scores: any, missing: string[]): { subject: string; body: string } {
  const subject = `${p.business_name}: votre score visibilité IA est de ${scores?.overall_score ?? p.aipp_score ?? "?"}/100`;
  const gaps = missing?.length ? missing.slice(0, 3).map((m: string) => `• ${m}`).join("\n") : "• Quelques améliorations rapides identifiées";
  const body = `Bonjour,

Nous avons analysé la présence en ligne de ${p.business_name} (${p.city || "QC"}).

Score actuel: ${scores?.overall_score ?? p.aipp_score ?? "—"}/100

Points d'amélioration prioritaires:
${gaps}

UNPRO connecte les ${p.trade || "entrepreneurs"} aux rendez-vous exclusifs adaptés à leur capacité.

Voir votre rapport personnalisé:
${PUBLIC_BASE}/pro/${p.public_slug || p.id}

— Alex, UNPRO`;
  return { subject, body };
}

function buildSms(p: any, scores: any): string {
  const score = scores?.overall_score ?? p.aipp_score ?? "—";
  return `${p.business_name}: votre score IA UNPRO = ${score}/100. Rapport: ${PUBLIC_BASE}/pro/${p.public_slug || p.id}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const s = svc();
  const { prospect_id, channel } = await req.json().catch(() => ({}));
  if (!prospect_id) return new Response(JSON.stringify({ error: "prospect_id requis" }), { status: 400, headers: cors });

  const runId = await startRun(s, "outreach", { prospect_id, channel });
  const { data: p } = await s.from("contractor_prospects").select("*").eq("id", prospect_id).maybeSingle();
  if (!p) {
    await log(s, runId, "outreach.load", "error", "Prospect introuvable", prospect_id);
    await finishRun(s, runId, { status: "failed" });
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: cors });
  }

  const { data: scores } = await s.from("contractor_aipp_scores").select("*").eq("prospect_id", prospect_id).maybeSingle();
  const missing: string[] = scores?.missing_data || [];

  const channels = channel ? [channel] : ["email", "sms"];
  const created: any[] = [];

  for (const ch of channels) {
    try {
      if (ch === "email") {
        if (!p.email) {
          await log(s, runId, "outreach.email", "blocked", "Email manquant", prospect_id);
          continue;
        }
        const { subject, body } = buildEmail(p, scores, missing);
        const { data: msg, error: insErr } = await s.from("outreach_messages").insert({
          prospect_id,
          channel_type: "email",
          provider_name: "resend",
          to_value: p.email,
          subject_rendered: subject,
          body_rendered: body,
          message_status: "draft",
        }).select("id").single();
        if (insErr) {
          await log(s, runId, "outreach.email", "error", insErr.message, prospect_id);
        } else if (msg) {
          created.push({ channel: "email", id: msg.id });
        }
      } else if (ch === "sms") {
        if (!p.phone) {
          await log(s, runId, "outreach.sms", "blocked", "Téléphone manquant", prospect_id);
          continue;
        }
        const body = buildSms(p, scores);
        const { data: msg, error: insErr } = await s.from("outreach_messages").insert({
          prospect_id,
          channel_type: "sms",
          provider_name: "twilio",
          to_value: p.phone,
          body_rendered: body,
          message_status: "draft",
        }).select("id").single();
        if (insErr) {
          await log(s, runId, "outreach.sms", "error", insErr.message, prospect_id);
        } else if (msg) {
          created.push({ channel: "sms", id: msg.id });
        }
      }
    } catch (e) {
      await log(s, runId, `outreach.${ch}`, "error", String(e), prospect_id);
    }
  }

  await s.from("contractor_prospects").update({
    outreach_status: created.length ? "queued" : (p.outreach_status || "not_started"),
    updated_at: new Date().toISOString(),
  }).eq("id", prospect_id);

  await log(s, runId, "outreach.done", "success", `${created.length} message(s) draft créé(s)`, prospect_id, { created });
  await finishRun(s, runId, { status: "succeeded", total_items: channels.length, succeeded_count: created.length });

  return new Response(JSON.stringify({ ok: true, messages: created, run_id: runId }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
