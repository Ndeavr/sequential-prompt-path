// mission-execute-wave
// Sends wave 1 (top N leads) via Resend (email) using generated outreach.
// Logs every send to outbound_sent_messages with mission_id attribution.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/mission-cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const FROM = "UNPRO <alex@notify.unpro.ca>";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { mission_id, wave_size = 10 } = await req.json();
    if (!mission_id) return jsonResponse({ error: "mission_id required" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: leads } = await supabase.from("outbound_leads")
      .select("id, email, company_name, hook_summary, phone")
      .eq("mission_id", mission_id)
      .eq("pipeline_stage", "ready_to_send")
      .limit(wave_size);

    if (!leads?.length) return jsonResponse({ ok: true, sent: 0, note: "no_ready_leads" });

    const leadIds = leads.map((l) => l.id);
    const { data: personalizations } = await supabase.from("outbound_ai_personalizations")
      .select("lead_id, generated_output, created_at")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false });

    const pByLead = new Map<string, any>();
    for (const p of personalizations ?? []) {
      if (!pByLead.has(p.lead_id)) {
        try { pByLead.set(p.lead_id, JSON.parse(p.generated_output ?? "{}")); }
        catch { pByLead.set(p.lead_id, {}); }
      }
    }

    let sent = 0; const errors: any[] = [];
    for (const lead of leads) {
      const p = pByLead.get(lead.id) ?? {};
      if (!lead.email) {
        // No email — mark for SMS fallback path (handled by existing twilio pipeline elsewhere)
        await supabase.from("outbound_leads").update({
          pipeline_stage: "needs_sms_or_enrich",
        }).eq("id", lead.id);
        continue;
      }
      const subject = p.subject || `${lead.company_name}: analyse IA UNPRO`;
      const html = `<div style="font-family:Inter,system-ui;font-size:15px;line-height:1.55;color:#111;max-width:560px">
        <p>${(p.email_body || p.landing_hook || "Bonjour,").replace(/\n/g, "<br>")}</p>
        <p style="margin-top:18px"><a href="https://unpro.ca/analyse/${lead.id}" style="display:inline-block;background:#060B14;color:#fbbf24;padding:12px 18px;border-radius:14px;text-decoration:none;font-weight:600">Voir mon analyse complète</a></p>
        <p style="font-size:12px;color:#666;margin-top:24px">UNPRO • Plateforme IA pour entrepreneurs du Québec</p>
      </div>`;

      try {
        const r = await sendEmail(lead.email, subject, html);
        await supabase.from("outbound_sent_messages").insert({
          lead_id: lead.id,
          mission_id,
          subject,
          body_preview: (p.email_body || "").slice(0, 240),
          provider_message_id: r.id ?? null,
          delivery_status: "sent",
        });
        await supabase.from("outbound_leads").update({
          pipeline_stage: "sent",
          last_contacted_at: new Date().toISOString(),
          sending_status: "sent",
        }).eq("id", lead.id);
        sent++;
      } catch (e) {
        errors.push({ lead: lead.id, error: String(e) });
      }
    }

    await supabase.from("outbound_missions").update({
      status: "optimizing",
    }).eq("id", mission_id);

    return jsonResponse({ ok: true, sent, errors });
  } catch (e) {
    console.error("execute-wave failed", e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
