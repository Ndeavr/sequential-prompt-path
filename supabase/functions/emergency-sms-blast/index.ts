// emergency-sms-blast — admin-triggered burst of 25 personalized SMS to unblock revenue.
// Rotates 5 message variants, forces first send to +15142499522, logs to acq_sms_logs,
// routes through the canonical sendSms() (which enforces mobile-only + Twilio Lookup).
//
// POST body: { dry_run?: boolean = true, batch?: number = 25, force_first_to?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VARIANTS = [
  (name: string) => `Bonjour ${name}, UNPRO peut vous envoyer 1 rendez-vous qualifié cette semaine. Activation 1 $ : https://unpro.ca/pro/activation`,
  (name: string) => `${name}, votre profil est visible sur UNPRO. Débloquez vos leads pour 1 $ ici : https://unpro.ca/pro/activation`,
  (name: string) => `Salut ${name} — nouveaux clients en attente près de chez vous sur UNPRO. Essai 1 $ : https://unpro.ca/pro/activation`,
  (name: string) => `Bonjour ${name}. Alex (IA d'UNPRO) a préqualifié un projet dans votre secteur. Activation 1 $ : https://unpro.ca/pro/activation`,
  (name: string) => `${name}, testez UNPRO pour 1 $ et recevez votre premier rendez-vous vérifié cette semaine : https://unpro.ca/pro/activation`,
];

function firstName(business: string | null): string {
  if (!business) return "Entrepreneur";
  return business.split(/[ \-,]/)[0].slice(0, 24) || "Entrepreneur";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default TRUE
    const batch = Math.min(Number(body.batch ?? 25), 50);
    const forceFirstTo: string | null = body.force_first_to ?? "+15142499522";

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Pool: prospects with a phone, not DNC, not already logged in acq_sms_logs.
    const { data: pool, error } = await sb
      .from("contractor_prospects")
      .select("id, business_name, phone, city")
      .not("phone", "is", null)
      .neq("phone", "")
      .neq("do_not_contact", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const { data: alreadySent } = await sb.from("acq_sms_logs").select("recipient_phone");
    const seen = new Set((alreadySent ?? []).map((r: any) => r.recipient_phone));

    const eligible = (pool ?? []).filter((p: any) => !seen.has(p.phone));

    // Force smoke-test first target if provided.
    const targets: Array<{ id: string | null; business_name: string; phone: string }> = [];
    if (forceFirstTo) targets.push({ id: null, business_name: "Fondateur UNPRO", phone: forceFirstTo });
    for (const p of eligible) {
      if (targets.length >= batch) break;
      if (p.phone === forceFirstTo) continue;
      targets.push({ id: p.id, business_name: p.business_name ?? "Entrepreneur", phone: p.phone });
    }

    const attempts: any[] = [];
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const variantIdx = i % VARIANTS.length;
      const message = VARIANTS[variantIdx](firstName(t.business_name));

      if (dryRun) {
        attempts.push({ dry_run: true, phone: t.phone, variant: variantIdx, body: message });
        continue;
      }

      try {
        const result = await sendSms({
          to: t.phone,
          body: message,
          message_type: "outreach",
          template_key: "emergency_blast",
          contractor_id: t.id ?? undefined,
          metadata: { source: "emergency-sms-blast", variant: variantIdx },
          strict_admin_override: t.phone === forceFirstTo,
        });
        const ok = ["sending", "sent", "queued", "delivered"].includes(result.status);
        await sb.from("acq_sms_logs").insert({
          contractor_id: t.id,
          recipient_phone: t.phone,
          body: message,
          status: ok ? "sent" : result.status,
          provider_message_id: result.twilio_sid,
          error: result.error_message ?? null,
          sent_at: ok ? new Date().toISOString() : null,
        });
        attempts.push({
          phone: t.phone, variant: variantIdx, status: result.status,
          twilio_sid: result.twilio_sid, error: result.error_message ?? null,
        });
      } catch (e: any) {
        const err = String(e?.message ?? e);
        await sb.from("acq_sms_logs").insert({
          contractor_id: t.id,
          recipient_phone: t.phone,
          body: message,
          status: "failed",
          provider_message_id: null,
          error: err,
          sent_at: null,
        });
        attempts.push({ phone: t.phone, variant: variantIdx, status: "failed", error: err });
      }
    }

    const summary = {
      dry_run: dryRun,
      eligible_pool: eligible.length,
      attempted: attempts.length,
      sent: attempts.filter((a) => ["sending", "sent", "queued", "delivered"].includes(a.status)).length,
      failed: attempts.filter((a) => a.status === "failed").length,
      attempts,
    };
    return new Response(JSON.stringify(summary), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
