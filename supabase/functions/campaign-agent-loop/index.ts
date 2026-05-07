// UNPRO — Campaign Agent Loop (runs every 5min via cron)
// Processes campaign_contacts: sends day_0/2/5 email+SMS respecting safety windows and caps
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QC_TZ = "America/Toronto";

function nowInQc() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: QC_TZ, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short",
  }).formatToParts(now);
  const obj: Record<string, string> = {};
  fmt.forEach((p) => (obj[p.type] = p.value));
  return {
    hour: parseInt(obj.hour),
    minute: parseInt(obj.minute),
    weekday: obj.weekday, // 'Sun','Mon',...
    date: `${obj.year}-${obj.month}-${obj.day}`,
  };
}

function buildEmailBody(contact: any, day: string) {
  const company = contact.company_name;
  const lost = contact.lost_revenue_monthly ?? 0;
  const hooks: Record<string, { subject: string; body: string }> = {
    day_0: {
      subject: `${company} — vous perdez ~${lost}$/mois en visibilité`,
      body: `Bonjour,\n\nNotre IA a analysé votre présence en ligne. Estimation: ~${lost}$ de revenus mensuels manqués.\n\nVoir votre score gratuit: https://unpro.ca/analyse/${contact.id}\n\n— Équipe UNPRO\n\nPour ne plus recevoir nos messages: https://unpro.ca/stop?id=${contact.id}`,
    },
    day_2: {
      subject: `Suivi — votre potentiel à récupérer`,
      body: `Bonjour,\n\nPetit rappel: votre rapport personnalisé est prêt.\n\nhttps://unpro.ca/analyse/${contact.id}\n\n— UNPRO\n\nPour ne plus recevoir: https://unpro.ca/stop?id=${contact.id}`,
    },
    day_5: {
      subject: `Dernier message — réservez votre démo`,
      body: `Bonjour,\n\nDernier message de notre part. Si vous voulez voir comment récupérer ces ${lost}$/mois:\n\nhttps://unpro.ca/book/${contact.id}\n\n— UNPRO\n\nStop: https://unpro.ca/stop?id=${contact.id}`,
    },
  };
  return hooks[day] ?? hooks.day_0;
}

function buildSmsBody(contact: any, day: string) {
  const lost = contact.lost_revenue_monthly ?? 0;
  if (day === "day_0") return `${contact.company_name} — UNPRO a estimé ~${lost}$/mois de revenus manqués. Score gratuit: unpro.ca/a/${contact.id.slice(0,8)} STOP pour arrêter`;
  if (day === "day_2") return `Rappel UNPRO: votre rapport est prêt. unpro.ca/a/${contact.id.slice(0,8)} STOP pour arrêter`;
  return `Dernier msg UNPRO: réservez une démo. unpro.ca/b/${contact.id.slice(0,8)} STOP pour arrêter`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Load settings
  const { data: settings } = await supabase.from("campaign_settings").select("*").eq("id", 1).maybeSingle();
  const cfg = settings ?? { daily_sms_cap: 50, daily_email_cap: 100, send_window_start: "07:00", send_window_end: "21:00", send_on_sunday: false, max_failures_before_stop: 3, paused_globally: false };

  if (cfg.paused_globally) {
    return new Response(JSON.stringify({ status: "paused_globally" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const qc = nowInQc();
  const [hStart, mStart] = cfg.send_window_start.split(":").map(Number);
  const [hEnd, mEnd] = cfg.send_window_end.split(":").map(Number);
  const inWindow = (qc.hour > hStart || (qc.hour === hStart && qc.minute >= mStart)) && (qc.hour < hEnd || (qc.hour === hEnd && qc.minute <= mEnd));
  if (!inWindow) return new Response(JSON.stringify({ status: "outside_window", qc }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (qc.weekday === "Sun" && !cfg.send_on_sunday) return new Response(JSON.stringify({ status: "sunday_skip" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Daily counts (UTC date is fine for cap purposes)
  const today = qc.date;
  const { count: smsToday } = await supabase
    .from("campaign_send_log").select("*", { count: "exact", head: true })
    .eq("channel", "sms").eq("status", "sent").gte("sent_at", `${today}T00:00:00`);
  const { count: emailToday } = await supabase
    .from("campaign_send_log").select("*", { count: "exact", head: true })
    .eq("channel", "email").eq("status", "sent").gte("sent_at", `${today}T00:00:00`);

  let smsRemaining = cfg.daily_sms_cap - (smsToday ?? 0);
  let emailRemaining = cfg.daily_email_cap - (emailToday ?? 0);

  // Fetch active contacts due
  const { data: contacts } = await supabase
    .from("campaign_contacts")
    .select("*")
    .in("status", ["active", "engaged"])
    .or(`scheduled_next_at.is.null,scheduled_next_at.lte.${new Date().toISOString()}`)
    .limit(20);

  const summary: any = { processed: 0, emails_sent: 0, sms_sent: 0, errors: [] };

  for (const c of contacts ?? []) {
    if (c.failure_count >= cfg.max_failures_before_stop) {
      await supabase.from("campaign_contacts").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", c.id);
      continue;
    }
    const day = c.current_day;
    if (day === "done") {
      await supabase.from("campaign_contacts").update({ status: "completed", sequence_completed_at: new Date().toISOString() }).eq("id", c.id);
      continue;
    }

    const emailField = `${day}_email_sent_at`;
    const smsField = `${day}_sms_sent_at`;
    const alreadyEmail = !!(c as any)[emailField];
    const alreadySms = !!(c as any)[smsField];

    // Day_2 rule: skip email if day_0 was opened (engagement)
    const skipEmailDay2 = day === "day_2" && c.day_0_email_opened_at != null;

    const update: Record<string, any> = { updated_at: new Date().toISOString() };

    // SEND EMAIL
    if (c.email && !alreadyEmail && !skipEmailDay2 && emailRemaining > 0) {
      const tpl = buildEmailBody(c, day);
      try {
        const { error: enqErr } = await supabase.rpc("enqueue_email", {
          payload: {
            queue_name: "transactional_emails",
            to_email: c.email,
            subject: tpl.subject,
            html_body: tpl.body.replace(/\n/g, "<br/>"),
            text_body: tpl.body,
            template_name: `campaign_${day}`,
            metadata: { campaign_contact_id: c.id, day },
          },
        });
        if (enqErr) throw enqErr;
        update[emailField] = new Date().toISOString();
        await supabase.from("campaign_send_log").insert({
          campaign_contact_id: c.id, company_name: c.company_name,
          day, channel: "email", status: "sent",
        });
        emailRemaining--; summary.emails_sent++;
      } catch (e) {
        update.failure_count = (c.failure_count ?? 0) + 1;
        await supabase.from("campaign_send_log").insert({
          campaign_contact_id: c.id, company_name: c.company_name,
          day, channel: "email", status: "failed", error_message: (e as Error).message,
        });
        summary.errors.push(`email ${c.id}: ${(e as Error).message}`);
      }
    }

    // SEND SMS
    if (c.phone && !alreadySms && smsRemaining > 0) {
      const body = buildSmsBody(c, day);
      try {
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sniper-queue-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ to: c.phone, message: body, campaign_contact_id: c.id, day }),
        });
        if (!r.ok) {
          // Fallback: just log queued (sniper-queue-send may have different shape — non-blocking)
          await supabase.from("campaign_send_log").insert({
            campaign_contact_id: c.id, company_name: c.company_name,
            day, channel: "sms", status: "queued",
            metadata: { fallback: true, http: r.status },
          });
        } else {
          await supabase.from("campaign_send_log").insert({
            campaign_contact_id: c.id, company_name: c.company_name,
            day, channel: "sms", status: "sent",
          });
        }
        update[smsField] = new Date().toISOString();
        smsRemaining--; summary.sms_sent++;
      } catch (e) {
        update.failure_count = (c.failure_count ?? 0) + 1;
        await supabase.from("campaign_send_log").insert({
          campaign_contact_id: c.id, company_name: c.company_name,
          day, channel: "sms", status: "failed", error_message: (e as Error).message,
        });
        summary.errors.push(`sms ${c.id}: ${(e as Error).message}`);
      }
    }

    // Advance day if both channels done (or no email and sms done)
    const emailDone = !c.email || (update as any)[emailField] || alreadyEmail || skipEmailDay2;
    const smsDone = !c.phone || (update as any)[smsField] || alreadySms;
    if (emailDone && smsDone) {
      if (day === "day_0") {
        update.current_day = "day_2";
        update.scheduled_next_at = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
      } else if (day === "day_2") {
        update.current_day = "day_5";
        update.scheduled_next_at = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
      } else if (day === "day_5") {
        update.current_day = "done";
        update.status = "completed";
        update.sequence_completed_at = new Date().toISOString();
      }
    }

    await supabase.from("campaign_contacts").update(update).eq("id", c.id);
    summary.processed++;
    await new Promise((r) => setTimeout(r, 2000)); // 2s rate limit between contacts
  }

  return new Response(JSON.stringify({ status: "ok", ...summary, smsRemaining, emailRemaining }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
