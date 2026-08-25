// UNPRO — affiliate-audit-track (public, sans JWT)
// Résout un jeton d'invitation d'évaluation IA et enregistre les vrais états
// (ouverte / commencée / terminée). Quand l'évaluation est terminée, le prospect
// bascule automatiquement dans le pipeline UNPRO existant.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? "").trim();
    const event = String(body.event ?? "opened");
    if (!token) return json({ error: "token_required" }, 400);

    const { data: audit } = await sb
      .from("ai_recommendation_audits")
      .select("id, affiliate_id, lead_id, business_name, city, trade, sent_at, opened_at, started_at, completed_at, status")
      .eq("invite_token", token)
      .maybeSingle();
    if (!audit) return json({ error: "invalid_token" }, 404);

    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = {};
    if (event === "opened" && !audit.opened_at) patch.opened_at = nowIso;
    if (event === "started") {
      if (!audit.opened_at) patch.opened_at = nowIso;
      if (!audit.started_at) patch.started_at = nowIso;
      patch.status = "running";
    }
    if (event === "completed") {
      if (!audit.opened_at) patch.opened_at = nowIso;
      if (!audit.started_at) patch.started_at = nowIso;
      if (!audit.completed_at) patch.completed_at = nowIso;
      patch.status = "completed";
    }

    if (Object.keys(patch).length > 0) {
      await sb.from("ai_recommendation_audits").update(patch).eq("id", audit.id);
      await sb.from("ai_recommendation_audit_events").insert({
        audit_id: audit.id,
        event_type: event,
        metadata: { affiliate_id: audit.affiliate_id, lead_id: audit.lead_id, via: "invite_token" },
      });
      if (audit.affiliate_id && audit.lead_id) {
        await sb.from("affiliate_lead_events").insert({
          affiliate_id: audit.affiliate_id,
          lead_id: audit.lead_id,
          event_type: "status_changed",
          channel: "audit",
          payload: { audit_event: event, audit_id: audit.id },
        });
      }
    }

    // Terminée → UNPRO prend la relève : le prospect passe au pipeline existant.
    if (event === "completed" && audit.lead_id) {
      await sb
        .from("contractor_leads")
        .update({
          contact_status: "clicked",
          pipeline_status: "audit_completed",
          lead_status: "qualified",
          updated_at: nowIso,
        })
        .eq("id", audit.lead_id);
    }

    return json({
      ok: true,
      audit: {
        id: audit.id,
        business_name: audit.business_name,
        city: audit.city,
        trade: audit.trade,
      },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
