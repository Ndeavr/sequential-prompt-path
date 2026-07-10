// activation-recovery-worker — sends staged reminders to stuck contractors
// +24h → attempt 1, +72h → attempt 2, +7d → attempt 3. Max 3 attempts enforced by unique constraint.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REMINDERS = [
  {
    attempt: 1,
    ageHoursMin: 24,
    ageHoursMax: 72,
    template_key: "war_room_recovery_1",
    body: "UNPRO: il vous reste 2 minutes pour activer votre profil. 1$ pour 7 jours. unpro.ca",
  },
  {
    attempt: 2,
    ageHoursMin: 72,
    ageHoursMax: 168,
    template_key: "war_room_recovery_2",
    body: "UNPRO: votre place réservée expire bientôt. Terminez votre activation: unpro.ca",
  },
  {
    attempt: 3,
    ageHoursMin: 168,
    ageHoursMax: 720,
    template_key: "war_room_recovery_3",
    body: "UNPRO: dernier rappel. Un conseiller peut vous appeler pour finaliser: unpro.ca",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const dryRun = new URL(req.url).searchParams.get("dry_run") !== "false";
  const summary: Record<string, number> = { candidates: 0, sent: 0, skipped: 0 };

  try {
    // Fetch stuck leads: registration started but profile not complete, and not yet paid
    const { data: leads } = await supabase
      .from("contractor_leads")
      .select("id, phone, company_name, onboarding_started_at, profile_status, paid_at")
      .not("onboarding_started_at", "is", null)
      .neq("profile_status", "complete")
      .is("paid_at", null)
      .limit(500);

    const now = Date.now();
    for (const l of (leads as Array<{
      id: string; phone: string | null; company_name: string | null;
      onboarding_started_at: string; profile_status: string; paid_at: string | null;
    }> | null) ?? []) {
      summary.candidates++;
      if (!l.phone) { summary.skipped++; continue; }

      const ageHours = (now - new Date(l.onboarding_started_at).getTime()) / 3_600_000;
      const rem = REMINDERS.find(r => ageHours >= r.ageHoursMin && ageHours < r.ageHoursMax);
      if (!rem) { summary.skipped++; continue; }

      // Already sent this attempt?
      const { data: existing } = await supabase
        .from("contractor_activation_reminders")
        .select("id")
        .eq("lead_id", l.id)
        .eq("attempt", rem.attempt)
        .maybeSingle();
      if (existing) { summary.skipped++; continue; }

      if (dryRun) { summary.sent++; continue; }

      const { error: smsErr } = await supabase.functions.invoke("acq-sms-send", {
        body: { lead_id: l.id, phone: l.phone, template_key: rem.template_key, body: rem.body },
      });
      if (smsErr) { summary.skipped++; continue; }

      await supabase.from("contractor_activation_reminders").insert({
        lead_id: l.id,
        stage: "profile_incomplete",
        attempt: rem.attempt,
        template_key: rem.template_key,
        channel: "sms",
      });
      summary.sent++;
    }

    return new Response(JSON.stringify({ dry_run: dryRun, ...summary }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[activation-recovery-worker]", e);
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
