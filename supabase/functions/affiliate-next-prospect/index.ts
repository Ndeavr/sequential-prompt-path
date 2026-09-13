// UNPRO — affiliate-next-prospect
// Sélectionne le meilleur prochain prospect réel pour l'affiliée authentifiée,
// pose un verrou anti-collision, et gère « passer » / « libérer ».
// Aucune donnée inventée : uniquement des lignes réelles de contractor_leads
// assignées à cette affiliée (ou créées par elle).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { computeContactPermissions, type SendEligibilityRow } from "../_shared/contactPermissions.ts";

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

function score(lead: Lead, nowMs: number, isRecovery = false): number {
  let s = 0;
  const followUp = lead.next_follow_up_at ? new Date(String(lead.next_follow_up_at)).getTime() : null;
  if (followUp && followUp <= nowMs) s += 1000; // suivi dû = priorité absolue
  // Onboarding à reprendre : passe devant les prospects froids jamais touchés,
  // sans jamais devancer un suivi dû.
  if (isRecovery) s += 500;
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
    // Seul un affilié ACTIF peut voir ou agir sur un dossier.
    if (String(affiliate.status ?? "") !== "active") {
      return json({ error: "affiliate_not_active" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "next");
    const nowIso = new Date().toISOString();

    /**
     * Propriété stricte : si `assigned_affiliate_id` est non nul, seul cet
     * affilié agit. `created_by_affiliate_id` n'est un repli que tant que le
     * dossier n'est assigné à personne.
     */
    const ownsLead = (l: { assigned_affiliate_id?: string | null; created_by_affiliate_id?: string | null }) =>
      l.assigned_affiliate_id
        ? l.assigned_affiliate_id === affiliate.id
        : l.created_by_affiliate_id === affiliate.id;

    // ── release / skip ────────────────────────────────────────────────
    if (action === "release" || action === "skip") {
      const leadId = body.lead_id ? String(body.lead_id) : null;
      if (leadId) {
        // Vérifier la propriété AVANT toute mutation : un lead_id arbitraire
        // ne doit jamais être modifiable.
        const { data: lead, error: leadErr } = await sb
          .from("contractor_leads")
          .select("id, assigned_affiliate_id, created_by_affiliate_id")
          .eq("id", leadId)
          .maybeSingle();
        if (leadErr) return json({ error: leadErr.message }, 500);
        if (!lead || !ownsLead(lead)) return json({ error: "not_your_lead" }, 403);

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
          const { error: upErr } = await sb.from("contractor_leads").update(patch).eq("id", leadId);
          if (upErr) return json({ error: upErr.message }, 500);
        }
      }
      if (action === "release") return json({ ok: true });
    }

    // ── next ──────────────────────────────────────────────────────────
    const { data: rawLeads, error } = await sb
      .from("contractor_leads")
      .select(
        "id, company_name, business_name, first_name, last_name, full_name, role_title, city, category_primary, trade, phone_e164, phone, email, website_url, contact_status, next_follow_up_at, last_contacted_at, priority_score, fit_score, profile_status, onboarding_started_at, payment_started_at, paid_at, profile_active_at, do_not_contact, unsubscribed_at, archived_at, sms_eligible, consent_to_contact, phone_validation_status, compliance_review_required, compliance_review_reason, assigned_affiliate_id, created_by_affiliate_id"
      )
      .or(`assigned_affiliate_id.eq.${affiliate.id},created_by_affiliate_id.eq.${affiliate.id}`)
      .is("archived_at", null)
      .limit(400);
    if (error) return json({ error: error.message }, 500);
    // Filtre de propriété stricte côté serveur (le OR SQL reste permissif).
    const leads = (rawLeads ?? []).filter((l) => ownsLead(l as any));


    // Onboardings routés pour reprise (faits réels uniquement)
    const { data: recoveryEvents, error: recErr } = await sb
      .from("affiliate_lead_events")
      .select("lead_id, payload, created_at")
      .eq("affiliate_id", affiliate.id)
      .eq("event_type", "onboarding_recovery_routed");
    if (recErr) return json({ error: recErr.message }, 500);
    const recoveryMap = new Map<string, { routed_at: string; payload: Record<string, unknown> }>();
    for (const e of (recoveryEvents ?? []) as Array<{ lead_id: string; payload: Record<string, unknown>; created_at: string }>) {
      recoveryMap.set(String(e.lead_id), { routed_at: e.created_at, payload: e.payload ?? {} });
    }


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
      // Révision de conformité ouverte : aucun contact, le dossier sort de la file.
      if (l.compliance_review_required === true) return false;
      if (DEAD_STATUSES.has(String(l.contact_status ?? ""))) return false;
      if (lockedByOthers.has(String(l.id))) return false;
      const followUp = l.next_follow_up_at ? new Date(String(l.next_follow_up_at)).getTime() : null;
      if (followUp && followUp > nowMs) return false; // rappel planifié plus tard
      return !!(l.phone_e164 || l.phone || l.email);
    });

    if (eligible.length === 0) {
      return json({ prospect: null, reason: "no_eligible_prospect", total_assigned: (leads ?? []).length });
    }

    eligible.sort(
      (a, b) =>
        score(b, nowMs, recoveryMap.has(String(b.id))) - score(a, nowMs, recoveryMap.has(String(a.id)))
    );
    const pick = eligible[0];
    const recovery = recoveryMap.get(String(pick.id)) ?? null;


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

    // Permissions de contact réelles (preuve LCAP par destination, échec fermé)
    const { data: eligRow, error: eligErr } = await sb
      .from("v_commercial_send_eligibility")
      .select("contractor_lead_id, compliance_review_required, compliance_review_reason, valid_phone_evidence_count, valid_email_evidence_count, phone_suppressed, email_suppressed")
      .eq("contractor_lead_id", pick.id)
      .maybeSingle();
    if (eligErr) return json({ error: `send_gate_failed: ${eligErr.message}` }, 500);
    const permissions = computeContactPermissions({
      eligibility: (eligRow ?? null) as SendEligibilityRow | null,
      has_phone: !!(pick.phone_e164 || pick.phone),
      has_email: !!pick.email,
      do_not_contact: pick.do_not_contact,
      unsubscribed: !!pick.unsubscribed_at,
      phone_validation_status: (pick.phone_validation_status as string | null) ?? null,
      compliance_review_required: (pick.compliance_review_required as unknown as boolean | null) ?? null,
      compliance_review_reason: (pick.compliance_review_reason as string | null) ?? null,
    });

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
      permissions,
      recovery: recovery
        ? {
            routed_at: recovery.routed_at,
            rule_version: recovery.payload.rule_version ?? null,
            inactivity_hours: recovery.payload.inactivity_hours ?? null,
            match_reasons: recovery.payload.match_reasons ?? [],
            interesting_reasons: recovery.payload.interesting_reasons ?? [],
            onboarding_started_at: pick.onboarding_started_at ?? null,
            profile_status: pick.profile_status ?? null,
            fit_score: pick.fit_score ?? null,
            priority_score: pick.priority_score ?? null,
          }
        : null,
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
