// UNPRO — Outreach Relance Cron (J+1 / J+3 / J+7)
// Selects prospects needing a follow-up SMS and dispatches via Twilio.
// Honors: cap 3 relances/prospect, dry_run flag, per-relance new landing token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RelanceRow {
  id: string;
  business_name: string | null;
  telephone: string | null;
  langue_preferee: string;
  funnel_status: string;
  funnel_status_updated_at: string | null;
  last_relance_at: string | null;
  relance_count: number;
  landing_token: string | null;
}

const COPY = {
  j1: "Toujours intéressé à être recommandé par l'IA d'UNPRO ? Activation 7 jours : 1 $. {link}",
  j3: "Nous recherchons actuellement des entrepreneurs dans votre secteur. Activation : 1 $. {link}",
  j7: "Dernier rappel. Votre profil peut être activé aujourd'hui pour 1 $. {link}",
};

function newToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 22);
}

async function sendTwilioSms(to: string, body: string): Promise<{ sid?: string; error?: string }> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER") ?? Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || !from) return { error: "twilio_env_missing" };
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = btoa(`${sid}:${token}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data?.message ?? `twilio_${res.status}` };
  return { sid: data?.sid };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let dryRun = true;
  let limit = 100;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.dry_run === "boolean") dryRun = body.dry_run;
      if (typeof body?.limit === "number") limit = Math.min(500, Math.max(1, body.limit));
    }
  } catch { /* ignore */ }

  const now = new Date();
  const iso = (offsetHours: number) =>
    new Date(now.getTime() - offsetHours * 3600_000).toISOString();

  // Windows
  //  J+1: sms_sent, no click, 24-72h since status update, relance_count=0
  //  J+3: clicked (or landing viewed) with no paid, 72h-7d, relance_count<=1
  //  J+7: any non-paid still open, 7d-14d, relance_count<=2

  async function pickBatch(
    kind: "j1" | "j3" | "j7",
    statuses: string[],
    minHours: number,
    maxHours: number,
    maxCount: number,
  ) {
    const { data, error } = await supabase
      .from("prospects")
      .select("id, business_name, telephone, langue_preferee, funnel_status, funnel_status_updated_at, last_relance_at, relance_count, landing_token")
      .in("funnel_status", statuses)
      .lt("relance_count", 3)
      .lte("relance_count", maxCount)
      .not("telephone", "is", null)
      .lte("funnel_status_updated_at", iso(minHours))
      .gte("funnel_status_updated_at", iso(maxHours))
      .limit(limit);
    if (error) throw error;
    // filter: last_relance_at older than 20h to avoid multi-fires in same hour
    return (data ?? []).filter((r: RelanceRow) => {
      if (!r.last_relance_at) return true;
      return new Date(r.last_relance_at).getTime() < now.getTime() - 20 * 3600_000;
    }) as RelanceRow[];
  }

  const summary = { j1: 0, j3: 0, j7: 0, sent: 0, failed: 0, skipped: 0, dry_run: dryRun };

  try {
    const batches: Array<{ kind: "j1" | "j3" | "j7"; rows: RelanceRow[] }> = [
      { kind: "j1", rows: await pickBatch("j1", ["sms_sent"], 24, 72, 0) },
      { kind: "j3", rows: await pickBatch("j3", ["clicked", "landing_viewed", "registered"], 72, 168, 1) },
      { kind: "j7", rows: await pickBatch("j7", ["clicked", "registered", "checkout_started", "profile_completed"], 168, 336, 2) },
    ];

    const publicBase =
      Deno.env.get("PUBLIC_APP_URL") ?? "https://unpro.ca";

    for (const batch of batches) {
      summary[batch.kind] = batch.rows.length;
      for (const p of batch.rows) {
        try {
          // Fresh token per relance
          const token = newToken();
          const link = `${publicBase}/r/${token}`;
          const body = COPY[batch.kind].replace("{link}", link);

          if (dryRun) {
            await supabase.from("acq_sms_logs").insert({
              recipient_phone: p.telephone,
              body,
              status: "simulated",
              error: `dry_run:${batch.kind}`,
              is_simulation: true,
              prospect_id: p.id,
              relance_kind: batch.kind,
              invitation_token: token,
            } as never);
            summary.skipped += 1;
            continue;
          }

          const res = await sendTwilioSms(p.telephone!, body);
          if (res.error) {
            await supabase.from("acq_sms_logs").insert({
              recipient_phone: p.telephone,
              body,
              status: "failed",
              error: res.error,
              is_simulation: false,
              prospect_id: p.id,
              relance_kind: batch.kind,
              invitation_token: token,
            } as never);
            summary.failed += 1;
            continue;
          }

          await supabase.from("acq_sms_logs").insert({
            recipient_phone: p.telephone,
            body,
            status: "sent",
            provider_message_id: res.sid ?? null,
            sent_at: now.toISOString(),
            is_simulation: false,
            prospect_id: p.id,
            relance_kind: batch.kind,
            invitation_token: token,
          } as never);

          await supabase
            .from("prospects")
            .update({
              landing_token: token,
              relance_count: (p.relance_count ?? 0) + 1,
              last_relance_at: now.toISOString(),
            } as never)
            .eq("id", p.id);

          await supabase.from("prospect_status_transitions").insert({
            prospect_id: p.id,
            previous_status: p.funnel_status,
            new_status: `relance_${batch.kind}`,
            source: "outreach-relance-cron",
            metadata: { dry_run: false, token },
          } as never);

          summary.sent += 1;
        } catch (rowErr) {
          console.error("[relance row error]", p.id, rowErr);
          summary.failed += 1;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[outreach-relance-cron]", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e), summary }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
