// UNPRO — affiliate-next-prospect
// Sélectionne le meilleur prochain prospect réel pour l'affiliée authentifiée,
// pose un verrou anti-collision, et gère « passer » / « libérer ».
// Aucune donnée inventée : uniquement des lignes réelles de contractor_leads
// assignées à cette affiliée (ou créées par elle).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOCK_MINUTES = 30;

const DEAD_STATUSES = new Set(["not_interested", "subscribed", "trial_1dollar", "converted", "won"]);

type Lead = Record<string, string | number | null>;

function score(lead: Lead, nowMs: number): number {
  let s = 0;
  const followUp = lead.next_follow_up_at ? new Date(String(lead.next_follow_up_at)).getTime() : null;
  if (followUp && followUp <= nowMs) s += 1000; // suivi dû = priorité absolue
  const hasPhone = !!lead.phone_e164;
  const hasName = !!(lead.first_name || lead.full_name);
  const hasEmail = !!lead.email;
  if (hasPhone && hasName) s += 400;
  else if (hasPhone) s += 300;
  else if (hasEmail) s += 120;
  if (String(lead.contact_status ?? "") === "called") s += 80;
  if (!lead.last_contacted_at) s += 40; // jamais contacté
  s += Math.min(Number(lead.priority_score ?? 0), 100);
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(SUPABASE_URL, SRK, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "unauthenticated" }, 401);
    const { data: userRes } = await sb.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthenticated" }, 401);

    const { data: affiliate } = await sb
      .from("affiliates")
      .select("id, first_name, name, referral_code, status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!affiliate) return json({ error: "not_an_affiliate" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "next");
    const nowIso = new Date().toISOString();

    // ── release / skip ────────────────────────────────────────────────
    if (action === "release" || action === "skip") {
      const leadId = body.lead_id ? String(body.lead_id) : null;
      if (leadId) {
        await sb.from("affiliate_prospect_locks").delete().eq("lead_id", leadId).eq("affiliate_id", affiliate.id);
        if (action === "skip") {
          const reason = String(body.reason ?? "autre");
          await sb.from("affiliate_lead_events").insert({
            affiliate_id: affiliate.id,
            lead_id: leadId,
            event_type: "status_changed",
            channel: "app",
            payload: { action: "skipped", reason },
          });
          const patch: Record<string, unknown> = { updated_at: nowIso };
          if (reason === "mauvais_numero") { patch.sms_eligible = false; patch.phone_validation_status = "invalid"; }
          if (reason === "pas_pertinent") { patch.contact_status = "not_interested"; }
          if (reason === "deja_contacte") { patch.contact_status = "called"; patch.last_contacted_at = nowIso; }
          if (reason === "pas_maintenant") {
            const d = new Date(Date.now() + 7 * 86400000).toISOString();
            patch.next_follow_up_at = d;
          }
          await sb.from("contractor_leads").update(patch).eq("id", leadId);
        }
      }
      if (action === "release") return json({ ok: true });
    }

    // ── next ──────────────────────────────────────────────────────────
    const { data: leads, error } = await sb
      .from("contractor_leads")
      .select(
        "id, company_name, business_name, first_name, last_name, full_name, role_title, city, category_primary, trade, phone_e164, phone, email, website_url, contact_status, next_follow_up_at, last_contacted_at, priority_score, do_not_contact, unsubscribed_at, archived_at, sms_eligible, consent_to_contact, assigned_affiliate_id, created_by_affiliate_id"
      )
      .or(`assigned_affiliate_id.eq.${affiliate.id},created_by_affiliate_id.eq.${affiliate.id}`)
      .is("archived_at", null)
      .limit(400);
    if (error) return json({ error: error.message }, 500);

    const { data: locks } = await sb
      .from("affiliate_prospect_locks")
      .select("lead_id, affiliate_id, expires_at")
      .gt("expires_at", nowIso);
    const lockedByOthers = new Set(
      (locks ?? []).filter((l) => l.affiliate_id !== affiliate.id).map((l) => String(l.lead_id))
    );

    const excludeId = body.exclude_lead_id ? String(body.exclude_lead_id) : null;
    const nowMs = Date.now();
    const eligible = (leads ?? []).filter((l: Lead) => {
      if (excludeId && String(l.id) === excludeId) return false;
      if (l.do_not_contact) return false;
      if (l.unsubscribed_at) return false;
      if (DEAD_STATUSES.has(String(l.contact_status ?? ""))) return false;
      if (lockedByOthers.has(String(l.id))) return false;
      const followUp = l.next_follow_up_at ? new Date(String(l.next_follow_up_at)).getTime() : null;
      if (followUp && followUp > nowMs) return false; // rappel planifié plus tard
      return !!(l.phone_e164 || l.phone || l.email);
    });

    if (eligible.length === 0) {
      return json({ prospect: null, reason: "no_eligible_prospect", total_assigned: (leads ?? []).length });
    }

    eligible.sort((a, b) => score(b, nowMs) - score(a, nowMs));
    const pick = eligible[0];

    await sb
      .from("affiliate_prospect_locks")
      .upsert(
        {
          lead_id: pick.id,
          affiliate_id: affiliate.id,
          expires_at: new Date(Date.now() + LOCK_MINUTES * 60000).toISOString(),
        },
        { onConflict: "lead_id" }
      );

    // Suivi d'évaluation déjà envoyée pour ce prospect (source unique = audits)
    const { data: audit } = await sb
      .from("ai_recommendation_audits")
      .select("id, invite_token, channel, sent_at, opened_at, started_at, completed_at, claimed_at, status")
      .eq("lead_id", pick.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return json({
      prospect: pick,
      audit: audit ?? null,
      affiliate: {
        id: affiliate.id,
        first_name: affiliate.first_name ?? (affiliate.name ? String(affiliate.name).split(" ")[0] : null),
        referral_code: affiliate.referral_code,
      },
      remaining: eligible.length,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
