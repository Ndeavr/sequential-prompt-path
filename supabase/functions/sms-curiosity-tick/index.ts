// sms-curiosity-tick — CRON */15: traite les séquences Curiosité 12 arrivées à échéance.
// Service-role only. Aucun input requis ; supporte ?force=1 pour debug.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  TOTAL_STEPS, templateKeyForStep, nextSendDate, renderTemplate,
  isWithinSendWindow, nextWindowOpening,
} from "../_shared/curiositySchedule.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const now = new Date();
    const withinWindow = force || isWithinSendWindow(now);

    const { data: due, error } = await supabase
      .from("contractor_curiosity_sms_sequences")
      .select("id, prospect_id, phone, current_step, meta, next_send_at, status")
      .eq("status", "active")
      .lte("next_send_at", now.toISOString())
      .limit(50);
    if (error) throw error;

    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Charger tous les templates une seule fois.
    const { data: templates } = await supabase
      .from("sms_templates").select("template_key, body_template")
      .in("template_key", Array.from({ length: TOTAL_STEPS }, (_, i) => templateKeyForStep(i + 1)));
    const tplMap = new Map((templates ?? []).map((t: any) => [t.template_key, t.body_template]));

    const { sendSms } = await import("../_shared/twilioSend.ts");

    const results: any[] = [];

    for (const seq of due) {
      const nextStep = (seq.current_step ?? 0) + 1;
      if (nextStep > TOTAL_STEPS) {
        await supabase.from("contractor_curiosity_sms_sequences")
          .update({ status: "completed" }).eq("id", seq.id);
        results.push({ id: seq.id, action: "completed" });
        continue;
      }

      // Vérifier opt-out à chaque tick.
      const { data: optOut } = await supabase
        .from("sms_opt_outs").select("id").eq("normalized_phone", seq.phone).maybeSingle();
      if (optOut) {
        await supabase.from("contractor_curiosity_sms_events").insert({
          sequence_id: seq.id, step: nextStep, template_key: templateKeyForStep(nextStep),
          status: "skipped_stop",
        });
        await supabase.from("contractor_curiosity_sms_sequences")
          .update({ status: "stopped", unsubscribed_at: now.toISOString() }).eq("id", seq.id);
        results.push({ id: seq.id, action: "stopped_opt_out" });
        continue;
      }

      // Hors fenêtre → reporte à la prochaine ouverture.
      if (!withinWindow) {
        const reschedule = nextWindowOpening(now);
        await supabase.from("contractor_curiosity_sms_sequences")
          .update({ next_send_at: reschedule.toISOString() }).eq("id", seq.id);
        results.push({ id: seq.id, action: "deferred_window", next_send_at: reschedule.toISOString() });
        continue;
      }

      const templateKey = templateKeyForStep(nextStep);
      const templateBody = tplMap.get(templateKey);
      if (!templateBody) {
        await supabase.from("contractor_curiosity_sms_events").insert({
          sequence_id: seq.id, step: nextStep, template_key: templateKey,
          status: "failed", error: "template_missing",
        });
        results.push({ id: seq.id, action: "failed_template_missing", step: nextStep });
        continue;
      }

      const meta = (seq.meta ?? {}) as Record<string, string>;
      const body = renderTemplate(templateBody, {
        company: meta.company ?? "",
        city: meta.city ?? "",
        service: meta.service ?? "",
        link: meta.link ?? "",
      });

      try {
        const send = await sendSms({
          to: seq.phone,
          body,
          message_type: "outreach",
          template_key: templateKey,
          metadata: { sequence: "curiosity_12", sequence_id: seq.id, step: nextStep, prospect_id: seq.prospect_id },
        });
        const ok = send.status === "sending" || send.status === "sent" || send.status === "delivered";

        await supabase.from("contractor_curiosity_sms_events").insert({
          sequence_id: seq.id,
          step: nextStep,
          template_key: templateKey,
          status: ok ? "sent" : "failed",
          twilio_sid: send.twilio_sid,
          error: ok ? null : (send.error_message ?? null),
          rendered_body: body,
        });

        if (!ok) {
          // On ne consomme pas le step en cas d'échec ; on retarde de 1h.
          const retry = new Date(now.getTime() + 60 * 60 * 1000);
          await supabase.from("contractor_curiosity_sms_sequences")
            .update({ next_send_at: retry.toISOString() }).eq("id", seq.id);
          results.push({ id: seq.id, action: "failed_retry", step: nextStep, error: send.error_message });
          continue;
        }

        // Succès : avance le step et planifie le suivant.
        const isLast = nextStep >= TOTAL_STEPS;
        // Date d'enrôlement de référence pour préserver la cadence : on recalcule à partir de la séquence d'origine.
        const { data: enrollRow } = await supabase
          .from("contractor_curiosity_sms_sequences").select("created_at").eq("id", seq.id).single();
        const enrolledAt = new Date(enrollRow!.created_at);
        const upd: any = {
          current_step: nextStep,
          last_sent_at: now.toISOString(),
        };
        if (isLast) {
          upd.status = "completed";
          upd.next_send_at = now.toISOString();
        } else {
          const nextAt = nextSendDate(enrolledAt, nextStep + 1);
          // Si l'offset est le même (ex: 6,7,8 tous J7), on espace de 30 min pour éviter le flood.
          const minNext = new Date(now.getTime() + 30 * 60 * 1000);
          upd.next_send_at = (nextAt > minNext ? nextAt : minNext).toISOString();
        }
        await supabase.from("contractor_curiosity_sms_sequences").update(upd).eq("id", seq.id);
        results.push({ id: seq.id, action: "sent", step: nextStep, twilio_sid: send.twilio_sid });
      } catch (err) {
        await supabase.from("contractor_curiosity_sms_events").insert({
          sequence_id: seq.id, step: nextStep, template_key: templateKey,
          status: "failed", error: String(err), rendered_body: body,
        });
        const retry = new Date(now.getTime() + 60 * 60 * 1000);
        await supabase.from("contractor_curiosity_sms_sequences")
          .update({ next_send_at: retry.toISOString() }).eq("id", seq.id);
        results.push({ id: seq.id, action: "exception", error: String(err) });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
