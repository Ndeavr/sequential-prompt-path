/**
 * crm-recovery-action — single entry point for every CRM recovery action.
 *
 * Dispatches to the EXISTING production functions (no new sender, no duplicated
 * pipeline). Guarantees: opt-out respected, one action per (prospect, action, day)
 * via idempotency key, and every attempt written to crm_action_log (audit).
 *
 * Body: { action, prospect_ids: string[], reason?, dry_run?, source? }
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { computeContactPermissions, type SendEligibilityRow } from "../_shared/contactPermissions.ts";
import { callCommercialSendGate, gateBlockMessage, type GateDecision } from "../_shared/commercialSendGate.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE = "https://unpro.ca";

type ActionResult = { prospect_id: string; action: string; status: string; result: string };

const ACTIONS = new Set([
  "validate_phone",
  "retry_sms",
  "second_sms",
  "send_email",
  "onboarding_email",
  "payment_email",
  "payment_sms",
  "resume_checkout",
  "new_checkout",
  "schedule_followup",
  "pause",
  "archive",
  "tag",
  "note",
  // The CRM drawer sends "add_note"; both names hit the same handler.
  "add_note",
  // Manual contact queue (« À contacter manuellement »)
  "assign",
  "reassign",
  "unassign",
  "reclaim_overdue",
  "log_outcome",
  "send_activation_link",
  "manual_contact_logged",
]);

const TERMINAL_OUTCOMES = new Set(["activated", "not_interested", "invalid_contact"]);

/** Actions permises à un affilié, uniquement sur un dossier qui lui est assigné. */
const AFFILIATE_ACTIONS = new Set([
  "manual_contact_logged",
  "log_outcome",
  "note",
  "add_note",
  "schedule_followup",
  "send_activation_link",
]);

/** Canal électronique commercial → exige une preuve LCAP valide par destination. */
const COMMERCIAL_CHANNEL: Record<string, "sms" | "email"> = {
  retry_sms: "sms",
  second_sms: "sms",
  payment_sms: "sms",
  send_email: "email",
  onboarding_email: "email",
  payment_email: "email",
};


function randToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function shell(body: string, ctaLabel: string, ctaUrl: string) {
  return `<div style="font-family:Inter,Arial,sans-serif;background:#ffffff;color:#111;padding:24px;max-width:560px">
${body}
<p style="margin:24px 0"><a href="${esc(ctaUrl)}" style="display:inline-block;padding:14px 22px;background:#0F62FE;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">${esc(ctaLabel)}</a></p>
<p style="color:#666;font-size:12px">Clara d'UNPRO — plateforme d'intelligence résidentielle québécoise.</p>
</div>`;
}

function outreachHtml(name: unknown, city: unknown, category: unknown, link: string) {
  return shell(
    `<h2 style="margin:0 0 12px">Bonjour ${esc(name ?? "")}</h2>
<p>Nous recevons des demandes en ${esc(category ?? "services résidentiels")} à ${esc(city ?? "votre région")} et votre entreprise correspond au profil recherché.</p>
<p>Voyez combien de rendez-vous exclusifs UNPRO peut vous garantir : <strong>jusqu'à 5 dès 350 $</strong> (paiement unique). Le nombre exact est calculé avant le paiement.</p>`,
    "Calculer ma garantie",
    link,
  );
}

function checkoutHtml(name: unknown, link: string) {
  return shell(
    `<h2 style="margin:0 0 12px">${esc(name ?? "Votre entreprise")} — il reste une étape</h2>
<p>Votre calcul de garantie UNPRO n'a pas été complété. L'offre d'entrée est de <strong>350 $ CA</strong>, paiement unique, jusqu'à 5 rendez-vous exclusifs garantis.</p>`,
    "Terminer mon activation",
    link,
  );
}


async function invokeFn(name: string, body: unknown) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${name} [${r.status}]: ${text.slice(0, 300)}`);
  return text.slice(0, 400);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const prospectIds: string[] = Array.isArray(body?.prospect_ids)
      ? body.prospect_ids.map(String).slice(0, 100)
      : [];
    const reason = body?.reason ? String(body.reason) : null;
    const source = body?.source === "automation" ? "automation" : "manual";
    const dryRun = body?.dry_run === true;
    const payloadExtra = (body?.payload ?? {}) as Record<string, unknown>;

    if (!ACTIONS.has(action)) return json({ error: "unknown_action", action }, 400);
    if (prospectIds.length === 0) return json({ error: "missing_prospect_ids" }, 400);

    // ─── Autorisation (échec fermé) ─────────────────────────────────────
    // Service role = appel interne. Sinon : JWT obligatoire, puis rôle admin
    // ou affilié propriétaire du dossier. Aucun accès anonyme.
    let actorId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const isServiceRole = bearer.length > 0 && bearer === SERVICE_KEY;
    let isAdmin = false;
    let actorAffiliateIds: string[] = [];

    if (!isServiceRole) {
      if (!bearer) return json({ error: "unauthorized" }, 401);
      const { data: userData } = await sb.auth.getUser(bearer);
      actorId = userData?.user?.id ?? null;
      if (!actorId) return json({ error: "unauthorized" }, 401);

      const { data: roles, error: roleErr } = await sb
        .from("user_roles").select("role").eq("user_id", actorId).eq("role", "admin");
      if (roleErr) return json({ error: "authorization_check_failed", detail: roleErr.message }, 500);
      isAdmin = (roles ?? []).length > 0;

      if (!isAdmin) {
        const { data: affs, error: affErr } = await sb
          .from("affiliates").select("id, status").eq("user_id", actorId);
        if (affErr) return json({ error: "authorization_check_failed", detail: affErr.message }, 500);
        actorAffiliateIds = (affs ?? []).filter((a: any) => a.status === "active").map((a: any) => String(a.id));
        if (actorAffiliateIds.length === 0) return json({ error: "forbidden" }, 403);
        if (!AFFILIATE_ACTIONS.has(action)) return json({ error: "forbidden_action", action }, 403);
      }
    }

    /** Un affilié ne peut agir que sur un dossier vivant qui lui appartient. */
    async function assertProspectAccess(pid: string): Promise<void> {
      if (isServiceRole || isAdmin) return;
      const { data, error } = await sb
        .from("crm_manual_assignments")
        .select("id, affiliate_id, owner_user_id")
        .eq("prospect_id", pid)
        .in("status", ["assigned", "in_progress"]);
      if (error) throw new Error(`authorization_check_failed: ${error.message}`);
      const owned = (data ?? []).some(
        (a: any) => (a.affiliate_id && actorAffiliateIds.includes(String(a.affiliate_id))) ||
                    (a.owner_user_id && String(a.owner_user_id) === actorId),
      );
      if (!owned) throw new Error("forbidden_not_assigned");
    }

    /** Décisions de la porte canonique conservées pour l'audit. */
    const gateAudits = new Map<string, GateDecision>();


    /**
     * Porte LCAP canonique par destination. Échec fermé : sans dossier de
     * conformité relié ou sans preuve valide, aucun envoi commercial.
     */
    async function assertCommercialSendAllowed(pid: string, kind: "sms" | "email", p: any): Promise<void> {
      const { data: bridge, error: bErr } = await sb
        .from("contractor_leads")
        .select("id, do_not_contact, unsubscribed_at, phone_validation_status, compliance_review_required, compliance_review_reason")
        .eq("source_prospect_id", pid)
        .maybeSingle();
      if (bErr) throw new Error(`send_gate_failed: ${bErr.message}`);

      let elig: SendEligibilityRow | null = null;
      if (bridge?.id) {
        const { data: e, error: eErr } = await sb
          .from("v_commercial_send_eligibility")
          .select("contractor_lead_id, compliance_review_required, compliance_review_reason, valid_phone_evidence_count, valid_email_evidence_count, phone_suppressed, email_suppressed")
          .eq("contractor_lead_id", bridge.id)
          .maybeSingle();
        if (eErr) throw new Error(`send_gate_failed: ${eErr.message}`);
        elig = (e ?? null) as SendEligibilityRow | null;
      }

      const perms = computeContactPermissions({
        eligibility: elig,
        has_phone: !!p?.phone_e164,
        has_email: !!p?.email,
        do_not_contact: bridge?.do_not_contact === true,
        unsubscribed: !!bridge?.unsubscribed_at,
        phone_validation_status: p?.phone_validation_status ?? bridge?.phone_validation_status ?? null,
        compliance_review_required: bridge?.compliance_review_required ?? null,
        compliance_review_reason: bridge?.compliance_review_reason ?? null,
      });
      const allowed = kind === "sms" ? perms.can_sms : perms.can_email;
      if (!allowed) throw new Error(`send_blocked: ${perms.reasons[kind] ?? "non autorisé"}`);

      // Porte canonique : la décision d'envoi appartient à commercial-send-gate.
      if (!bridge?.id) throw new Error("send_blocked: aucun dossier de conformité relié (porte canonique inaccessible)");
      const destination = kind === "sms" ? String(p?.phone_e164 ?? "") : String(p?.email ?? "");
      const decision = await callCommercialSendGate({
        contractor_lead_id: bridge.id,
        destination_type: kind === "sms" ? "phone_sms" : "email",
        destination,
        sender_name: "UNPRO",
      });
      gateAudits.set(`${pid}:${kind}`, decision);
      if (!decision.pass) throw new Error(`send_blocked: ${gateBlockMessage(decision)}`);
    }

    const day = new Date().toISOString().slice(0, 10);
    const results: ActionResult[] = [];

    for (const pid of prospectIds) {
      const idem = `${pid}:${action}:${day}`;
      let status = "success";
      let result = "";

      try {
        const { data: p } = await sb
          .from("verified_contractor_prospects")
          .select("id, business_name, city, category, email, phone_e164, phone_validation_status, outreach_status")
          .eq("id", pid)
          .maybeSingle();
        if (!p) throw new Error("prospect_not_found");

        await assertProspectAccess(pid);

        // Porte LCAP canonique avant tout message électronique commercial.
        const commercialKind = COMMERCIAL_CHANNEL[action];
        if (commercialKind) await assertCommercialSendAllowed(pid, commercialKind, p);
        if (action === "send_activation_link") {
          await assertCommercialSendAllowed(pid, String(payloadExtra.channel ?? "sms") === "email" ? "email" : "sms", p);
        }

        // Opt-out / STOP guard for every outbound action.
        const outbound = ["retry_sms", "second_sms", "send_email", "onboarding_email", "payment_email", "payment_sms", "send_activation_link"];
        if (outbound.includes(action)) {
          if (p.phone_e164) {
            const { data: stop } = await sb
              .from("sms_opt_outs")
              .select("id")
              .eq("normalized_phone", p.phone_e164)
              .maybeSingle();
            if (stop) throw new Error("opted_out");
          }
          // Idempotency: same action, same prospect, same day → skip.
          const { data: prior } = await sb
            .from("crm_action_log")
            .select("id")
            .eq("idempotency_key", idem)
            .maybeSingle();
          if (prior) {
            results.push({ prospect_id: pid, action, status: "skipped", result: "duplicate_same_day" });
            continue;
          }
        }

        if (dryRun) {
          results.push({ prospect_id: pid, action, status: "dry_run", result: "would_execute" });
          continue;
        }

        // Resolve or create an activation token/link when needed.
        const needsLink = ["payment_email", "payment_sms", "second_sms", "resume_checkout", "new_checkout", "onboarding_email", "send_email", "send_activation_link"];

        let link = "";
        if (needsLink.includes(action)) {
          const { data: tok } = await sb
            .from("verified_prospect_tokens")
            .select("token")
            .eq("prospect_id", pid)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          let token = tok?.token as string | undefined;
          if (!token || action === "new_checkout") {
            token = randToken();
            const { error } = await sb.from("verified_prospect_tokens").insert({ token, prospect_id: pid });
            if (error) throw new Error(`token_create_failed: ${error.message}`);
          }
          link = `${BASE}/unpro/activate/${token}`;
        }

        switch (action) {
          case "validate_phone":
            result = await invokeFn("contact-verification-enqueue", {
              business_name: p.business_name,
              phone: p.phone_e164,
              email: p.email,
              category: p.category,
              city: p.city,
              source_lead_id: pid,
              source_table: "verified_contractor_prospects",
            });
            break;

          case "retry_sms":
            result = await invokeFn("send-verified-batch", { prospect_ids: [pid], dry_run: false, limit: 1 });
            break;

          case "second_sms":
          case "payment_sms":
            result = await invokeFn("second-touch-outreach", { prospect_ids: [pid], dry_run: false, limit: 1 });
            break;

          case "send_email":
          case "onboarding_email": {
            if (!p.email) throw new Error("no_email");
            // Canonical outbound path: outreach-resend-send (clara@mail.unpro.ca).
            // The legacy Lovable Emails path (send-transactional-email) is disabled
            // for this project (403 "Emails disabled for this project") and would
            // dead-letter silently, so it is never used for recruitment email.
            result = await invokeFn("outreach-resend-send", {
              to: p.email,
              subject: `${p.business_name ?? "Votre entreprise"} — votre activation UNPRO est prête`,
              message_id: `crm-${idem}`,
              template_name: "prospect-outreach",
              cta_url: link,
              html: outreachHtml(p.business_name, p.city, p.category, link),
              tags: { campaign: "crm_recovery", action },
            });
            break;
          }

          case "payment_email": {
            if (!p.email) throw new Error("no_email");
            result = await invokeFn("outreach-resend-send", {
              to: p.email,
              subject: "Il reste une étape : calculez votre garantie",
              message_id: `crm-${idem}`,
              template_name: "incomplete-checkout-followup",
              cta_url: link,
              html: checkoutHtml(p.business_name, link),
              tags: { campaign: "crm_recovery", action },
            });
            break;
          }


          case "resume_checkout":
          case "new_checkout":
            result = link;
            break;

          case "schedule_followup":
            // Scheduled intent lives in the audit log; the automation tick reads it.
            await sb.from("crm_action_log").insert({
              prospect_id: pid,
              action: "scheduled_followup",
              source,
              reason: reason ?? "crm_manual",
              status: "scheduled",
              payload: { scheduled_for: new Date(Date.now() + 24 * 3600 * 1000).toISOString() },
              actor_id: actorId,
            });
            result = "scheduled_24h";
            break;

          case "pause":
            await sb.from("verified_contractor_prospects")
              .update({ outreach_status: "paused", last_action_at: new Date().toISOString() })
              .eq("id", pid);
            result = "paused";
            break;

          case "archive":
            await sb.from("verified_contractor_prospects")
              .update({ outreach_status: "archived", last_action_at: new Date().toISOString() })
              .eq("id", pid);
            result = "archived";
            break;

          case "tag": {
            const tag = String(payloadExtra.tag ?? "").trim();
            if (!tag) throw new Error("missing_tag");
            await sb.from("crm_prospect_tags").upsert(
              { prospect_id: pid, tag, author_id: actorId },
              { onConflict: "prospect_id,tag" },
            );
            result = `tag:${tag}`;
            break;
          }

          // UI sends "add_note"; keep "note" as a backwards-compatible alias.
          case "note":
          case "add_note": {
            const note = String(payloadExtra.note ?? "").trim();
            if (!note) throw new Error("missing_note");
            const { error: noteErr } = await sb
              .from("crm_prospect_notes")
              .insert({ prospect_id: pid, note, author_id: actorId });
            if (noteErr) throw new Error(`note_insert_failed: ${noteErr.message}`);
            result = "note_added";
            break;
          }

          // ─── File « À contacter manuellement » ───────────────────────
          case "assign":
          case "reassign": {
            const affiliateId = (payloadExtra.affiliate_id ?? null) as string | null;
            const ownerUserId = (payloadExtra.owner_user_id ?? (affiliateId ? null : actorId)) as string | null;
            if (!affiliateId && !ownerUserId) throw new Error("missing_owner");

            // One active assignment per prospect: close the current one first.
            const { data: active } = await sb
              .from("crm_manual_assignments")
              .select("id, affiliate_id, owner_user_id")
              .eq("prospect_id", pid)
              .in("status", ["assigned", "in_progress"])
              .maybeSingle();

            if (active) {
              if (action === "assign") {
                results.push({ prospect_id: pid, action, status: "skipped", result: "already_assigned" });
                continue;
              }
              await sb
                .from("crm_manual_assignments")
                .update({ status: "closed_lost", closed_at: new Date().toISOString() })
                .eq("id", active.id);
            }

            const { data: ins, error: insErr } = await sb
              .from("crm_manual_assignments")
              .insert({
                prospect_id: pid,
                affiliate_id: affiliateId,
                owner_user_id: ownerUserId,
                assigned_by: actorId,
                priority: Number(payloadExtra.priority ?? 0),
                next_action: String(payloadExtra.next_action ?? "call"),
                due_at: (payloadExtra.due_at as string | undefined) ??
                  new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
              })
              .select("id")
              .maybeSingle();
            if (insErr) throw new Error(`assign_failed: ${insErr.message}`);

            // Notification d'assignation (chemin courriel sortant existant).
            // `suppress_notification` n'est honoré que pour un appel interne
            // vérifié (service role). Une charge utile admin ne suffit pas.
            const suppressNotification = isServiceRole && payloadExtra.suppress_notification === true;
            if (affiliateId && !suppressNotification) {
              const { data: aff } = await sb
                .from("affiliates")
                .select("email, name")
                .eq("id", affiliateId)
                .maybeSingle();
              if (aff?.email) {
                try {
                  await invokeFn("outreach-resend-send", {
                    to: aff.email,
                    subject: `Nouveau prospect assigné : ${p.business_name ?? ""}`,
                    message_id: `assign-${ins?.id}`,
                    template_name: "affiliate-assignment",
                    cta_url: `${BASE}/affiliate`,
                    html: shell(
                      `<h2 style="margin:0 0 12px">Bonjour ${esc(aff.name ?? "")}</h2>
<p>Un nouveau prospect vous est assigné : <strong>${esc(p.business_name ?? "")}</strong>${p.city ? ` (${esc(p.city)})` : ""}.</p>
<p>Appelez-le aujourd'hui et consignez le résultat dans « Mes prospects ».</p>`,
                      "Voir mes prospects",
                      `${BASE}/affiliate`,
                    ),
                    tags: { campaign: "crm_manual_queue", action: "assignment_notification" },
                  });
                } catch (_e) {
                  // La notification ne doit jamais bloquer l'assignation.
                }
              }
            }
            result = `assigned:${ins?.id ?? ""}`;
            break;
          }

          case "unassign": {
            const { error: uErr } = await sb
              .from("crm_manual_assignments")
              .update({ status: "closed_lost", closed_at: new Date().toISOString() })
              .eq("prospect_id", pid)
              .in("status", ["assigned", "in_progress"]);
            if (uErr) throw new Error(`unassign_failed: ${uErr.message}`);
            result = "unassigned";
            break;
          }

          case "reclaim_overdue": {
            const { data: rec, error: rErr } = await sb
              .from("crm_manual_assignments")
              .update({
                affiliate_id: null,
                owner_user_id: actorId,
                assigned_by: actorId,
                assigned_at: new Date().toISOString(),
                due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
              })
              .eq("prospect_id", pid)
              .in("status", ["assigned", "in_progress"])
              .lt("due_at", new Date().toISOString())
              .select("id");
            if (rErr) throw new Error(`reclaim_failed: ${rErr.message}`);
            if (!rec || rec.length === 0) {
              results.push({ prospect_id: pid, action, status: "skipped", result: "not_overdue" });
              continue;
            }
            result = "reclaimed";
            break;
          }

          case "log_outcome": {
            const outcome = String(payloadExtra.outcome ?? "").trim();
            if (!outcome) throw new Error("missing_outcome");
            const terminal = TERMINAL_OUTCOMES.has(outcome);
            const { data: asg } = await sb
              .from("crm_manual_assignments")
              .select("id, affiliate_id")
              .eq("prospect_id", pid)
              .in("status", ["assigned", "in_progress"])
              .maybeSingle();
            if (!asg) throw new Error("no_active_assignment");

            const nextAction = terminal ? null : String(payloadExtra.next_action ?? "call");
            const dueAt = terminal
              ? null
              : ((payloadExtra.due_at as string | undefined) ??
                new Date(Date.now() + 24 * 3600 * 1000).toISOString());

            const { error: oErr } = await sb.from("crm_contact_outcomes").insert({
              assignment_id: asg.id,
              prospect_id: pid,
              actor_id: actorId,
              affiliate_id: asg.affiliate_id,
              channel: String(payloadExtra.channel ?? "call"),
              outcome,
              objection: (payloadExtra.objection as string | undefined) ?? null,
              note: (payloadExtra.note as string | undefined) ?? null,
              next_action: nextAction,
              due_at: dueAt,
            });
            if (oErr) throw new Error(`outcome_failed: ${oErr.message}`);
            result = terminal ? `closed:${outcome}` : `logged:${outcome}`;
            break;
          }

          case "send_activation_link": {
            const channel = String(payloadExtra.channel ?? "sms");
            if (channel === "email") {
              if (!p.email) throw new Error("no_email");
              result = await invokeFn("outreach-resend-send", {
                to: p.email,
                subject: "Votre garantie UNPRO — dès 350 $",
                message_id: `crm-${idem}`,
                template_name: "incomplete-checkout-followup",
                cta_url: link,
                html: checkoutHtml(p.business_name, link),
                tags: { campaign: "crm_manual_queue", action },
              });
            } else {
              result = await invokeFn("second-touch-outreach", { prospect_ids: [pid], dry_run: false, limit: 1 });
              // Ne jamais rapporter un succès si le fournisseur n'a rien accepté/mis en file.
              let sentCount = 0;
              try {
                const parsed = JSON.parse(result) as { sent?: number };
                sentCount = Number(parsed?.sent ?? 0);
              } catch { sentCount = 0; }
              if (sentCount < 1) throw new Error(`provider_not_accepted: ${result.slice(0, 200)}`);
            }
            result = `${link} | ${result}`;
            break;
          }

          case "manual_contact_logged": {
            // Composition manuelle (tel:/sms:/mailto:) depuis l'appareil de
            // l'opérateur — aucun envoi plateforme, journalisation seulement.
            await sb
              .from("crm_manual_assignments")
              .update({ status: "in_progress" })
              .eq("prospect_id", pid)
              .in("status", ["assigned"]);
            result = `manual_${String(payloadExtra.channel ?? "call")}`;
            break;
          }

          default:
            throw new Error(`unknown_action:${action}`);

        }
      } catch (e) {
        status = "failed";
        result = e instanceof Error ? e.message : String(e);
      }

      results.push({ prospect_id: pid, action, status, result: result.slice(0, 400) });

      // Notes are repeatable by design — an operator can add several the same
      // day. Reusing the daily `idem` key made the 2nd note collide on the
      // unique index and fail. Only the once-per-day OUTBOUND actions may
      // claim the stable key.
      const repeatable = action === "note" || action === "add_note";
      const logKey =
        status === "success" && !dryRun && !repeatable
          ? idem
          : `${idem}:${crypto.randomUUID().slice(0, 8)}`;

      const { error: logErr } = await sb.from("crm_action_log").insert({
        prospect_id: pid,
        action,
        source,
        reason,
        status,
        result: result.slice(0, 1000),
        payload: {
          dry_run: dryRun,
          ...payloadExtra,
          // Décision de la porte canonique conservée avec l'envoi (audit LCAP).
          send_gate: gateAudits.get(`${pid}:sms`) ?? gateAudits.get(`${pid}:email`) ?? null,
        },
        actor_id: actorId,
        idempotency_key: logKey,
      });
      if (logErr) {
        // The audit write must never silently disappear.
        console.error(`[crm-recovery-action] audit log insert failed (${action}/${pid}):`, logErr.message);
      }
    }

    return json({
      ok: true,
      action,
      dry_run: dryRun,
      total: results.length,
      succeeded: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      results,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
