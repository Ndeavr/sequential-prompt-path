// UNPRO — affiliate-send-audit
// Génère (ou réutilise) l'évaluation IA attribuée à une affiliée + un prospect réel,
// construit le lien tracké unique et délègue l'envoi aux canaux existants
// (Twilio via _shared/twilioSend.ts, Resend via outreach-resend-send).
// Aucune commission, aucun audit et aucune statistique inventés.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";
import { computeContactPermissions, type SendEligibilityRow } from "../_shared/contactPermissions.ts";
import { callCommercialSendGate, gateBlockMessage } from "../_shared/commercialSendGate.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_BASE = "https://unpro.ca";
// Plafond quotidien par affiliée (protection réputation + CASL/fréquence).
// Atteint → aucun envoi, le prospect reste en file pour le lendemain.
const AFFILIATE_DAILY_SEND_CAP = 40;

function makeToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(SUPABASE_URL, SRK, { auth: { persistSession: false } });
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "unauthenticated" }, 401);
    const { data: userRes } = await sb.auth.getUser(jwt);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthenticated" }, 401);

    const { data: affiliate } = await sb
      .from("affiliates")
      .select("id, first_name, name, referral_code, status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!affiliate) return json({ error: "not_an_affiliate" }, 403);
    if (String(affiliate.status ?? "") !== "active") {
      return json({ error: "affiliate_not_active" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const leadId = String(body.lead_id ?? "");
    const channel = body.channel === "email" ? "email" : "sms";
    const isReminder = !!body.reminder;
    if (!leadId) return json({ error: "lead_id_required" }, 400);

    const { data: lead } = await sb
      .from("contractor_leads")
      .select(
        "id, company_name, business_name, first_name, full_name, city, category_primary, trade, phone_e164, phone, email, do_not_contact, unsubscribed_at, sms_eligible, phone_validation_status, compliance_review_required, compliance_review_reason, assigned_affiliate_id, created_by_affiliate_id"
      )
      .eq("id", leadId)
      .maybeSingle();
    if (!lead) return json({ error: "lead_not_found" }, 404);
    // Propriété stricte : l'assignation prime; le créateur n'est un repli que
    // tant que le dossier n'est assigné à personne.
    const owns = lead.assigned_affiliate_id
      ? lead.assigned_affiliate_id === affiliate.id
      : lead.created_by_affiliate_id === affiliate.id;
    if (!owns) return json({ error: "forbidden" }, 403);

    if (lead.do_not_contact || lead.unsubscribed_at) {
      return json({ error: "opted_out", message: "Cette entreprise a demandé à ne pas être contactée." }, 409);
    }

    // ── Porte LCAP canonique par destination (échec fermé) ──────────────
    const { data: eligRow, error: eligErr } = await sb
      .from("v_commercial_send_eligibility")
      .select("contractor_lead_id, compliance_review_required, compliance_review_reason, valid_phone_evidence_count, valid_email_evidence_count, phone_suppressed, email_suppressed")
      .eq("contractor_lead_id", leadId)
      .maybeSingle();
    if (eligErr) return json({ error: "send_gate_failed", message: eligErr.message }, 500);
    const perms = computeContactPermissions({
      eligibility: (eligRow ?? null) as SendEligibilityRow | null,
      has_phone: !!(lead.phone_e164 || lead.phone),
      has_email: !!lead.email,
      do_not_contact: lead.do_not_contact,
      unsubscribed: !!lead.unsubscribed_at,
      phone_validation_status: (lead as Record<string, unknown>).phone_validation_status as string | null,
      compliance_review_required: (lead as Record<string, unknown>).compliance_review_required as boolean | null,
      compliance_review_reason: (lead as Record<string, unknown>).compliance_review_reason as string | null,
    });
    if (channel === "sms" ? !perms.can_sms : !perms.can_email) {
      return json({
        error: "send_not_permitted",
        message: perms.reasons[channel] ?? "Envoi non autorisé pour cette destination.",
        research_only: perms.research_only,
      }, 409);
    }

    // ── Porte canonique commercial-send-gate (décision d'envoi finale) ──
    const destination = channel === "sms" ? String(lead.phone_e164 || lead.phone || "") : String(lead.email ?? "");
    const gate = await callCommercialSendGate({
      contractor_lead_id: leadId,
      destination_type: channel === "sms" ? "phone_sms" : "email",
      destination,
      sender_name: "UNPRO",
    });
    if (!gate.pass) {
      return json({
        error: "send_not_permitted",
        message: gateBlockMessage(gate),
        blocked_reasons: gate.blocked_reasons,
        gate_audit_id: gate.gate_audit_id,
      }, 409);
    }


    // ── Plafond quotidien affilié (file d'attente, jamais de contournement) ──
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count: sentToday } = await sb
      .from("affiliate_lead_events")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id)
      .in("event_type", ["unpro_sms_dispatched", "email_sent"])
      .gte("created_at", startOfDay.toISOString());
    if ((sentToday ?? 0) >= AFFILIATE_DAILY_SEND_CAP) {
      return json({
        error: "daily_limit_reached",
        message: `Limite quotidienne atteinte (${AFFILIATE_DAILY_SEND_CAP} envois). Ce prospect reste dans votre file pour demain.`,
        sent_today: sentToday ?? 0,
        daily_cap: AFFILIATE_DAILY_SEND_CAP,
      }, 429);
    }

    const company = (lead.company_name || lead.business_name || "votre entreprise") as string;
    const firstName = (lead.first_name || (lead.full_name ? String(lead.full_name).split(" ")[0] : null)) as string | null;
    const affiliateFirst = (affiliate.first_name || (affiliate.name ? String(affiliate.name).split(" ")[0] : "UNPRO")) as string;

    // ── audit réutilisé ou créé ───────────────────────────────────────
    const { data: existing } = await sb
      .from("ai_recommendation_audits")
      .select("id, invite_token, sent_at, channel, opened_at, started_at, completed_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let audit = existing;
    if (!audit) {
      const inviteToken = makeToken();
      const { data: created, error: cErr } = await sb
        .from("ai_recommendation_audits")
        .insert({
          session_token: crypto.randomUUID(),
          query_text: company,
          source: "affiliate_action_mode",
          business_name: company,
          city: lead.city,
          trade: lead.trade ?? lead.category_primary,
          status: "invited",
          affiliate_id: affiliate.id,
          lead_id: leadId,
          invite_token: inviteToken,
          channel,
        })
        .select("id, invite_token, sent_at, channel, opened_at, started_at, completed_at")
        .single();
      if (cErr) return json({ error: `audit_create_failed: ${cErr.message}` }, 500);
      audit = created;
    } else if (audit.sent_at && !isReminder) {
      return json({
        error: "already_sent",
        message: "Une évaluation a déjà été envoyée à cette entreprise.",
        audit,
      }, 409);
    }

    // Lien personnalisé : le jeton ouvre l'évaluation de CETTE entreprise
    // (jamais une page générique) et `ref` porte l'attribution affiliée
    // jusqu'aux métadonnées Stripe.
    const linkParams = new URLSearchParams({ t: String(audit!.invite_token) });
    if (affiliate.referral_code) linkParams.set("ref", String(affiliate.referral_code));
    linkParams.set("utm_source", channel === "sms" ? "sms" : "email");
    linkParams.set("utm_medium", "affiliate");
    linkParams.set("utm_campaign", "affiliate_audit_invite");
    const link = `${PUBLIC_BASE}/entrepreneurs/audit-ia?${linkParams.toString()}`;
    const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
    const text = isReminder
      ? `${greeting}\n\nPetit rappel : le lien pour vérifier la présence IA de ${company} est toujours actif.\n\n${link}\n\nC'est gratuit.\n\n— ${affiliateFirst}, UNPRO`
      : `${greeting}\n\nComme discuté, voici le lien pour vérifier la présence IA de ${company} :\n\n${link}\n\nVous pourrez voir comment votre entreprise est comprise et recommandée par les moteurs de recherche IA. L'évaluation est gratuite.\n\n— ${affiliateFirst}, UNPRO`;

    let deliveryStatus = "unknown";
    let providerRef: string | null = null;

    if (channel === "sms") {
      const to = (lead.phone_e164 || lead.phone) as string | null;
      if (!to) return json({ error: "missing_phone", message: "Aucun numéro de téléphone — envoyez par courriel." }, 400);
      const res = await sendSms({
        to,
        body: text,
        message_type: "outreach",
        template_key: isReminder ? "affiliate_audit_reminder" : "affiliate_audit_invite",
        lead_id: leadId,
        metadata: { affiliate_id: affiliate.id, audit_id: audit!.id, source: "affiliate_action_mode" },
      });
      deliveryStatus = res.status;
      providerRef = res.twilio_sid ?? null;
      if (res.status === "failed" || res.error_message) {
        return json({ error: "sms_failed", message: res.error_message ?? "Envoi SMS refusé.", status: res.status }, 502);
      }
    } else {
      const to = lead.email as string | null;
      if (!to) return json({ error: "missing_email", message: "Aucun courriel — appelez ou envoyez par SMS." }, 400);
      const html = `<p>${greeting}</p><p>Comme discuté, voici le lien pour vérifier la présence IA de <strong>${company}</strong> :</p><p><a href="${link}">Voir l'évaluation IA de ${company}</a></p><p>Vous pourrez voir comment votre entreprise est comprise et recommandée par les moteurs de recherche IA. L'évaluation est gratuite.</p><p>— ${affiliateFirst}, UNPRO</p>`;
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/outreach-resend-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SRK}` },
        body: JSON.stringify({
          to,
          subject: `Présence IA de ${company} — évaluation gratuite`,
          html,
          cta_url: link,
          template_name: isReminder ? "affiliate_audit_reminder" : "affiliate_audit_invite",
          tags: { source: "affiliate_action_mode" },
        }),
      });
      const out = await resp.json().catch(() => ({}));
      if (!resp.ok || out?.error) {
        return json({ error: "email_failed", message: out?.error ?? "Envoi courriel refusé." }, 502);
      }
      deliveryStatus = "sent";
      providerRef = out?.id ?? out?.message_id ?? null;
    }

    const nowIso = new Date().toISOString();
    await sb
      .from("ai_recommendation_audits")
      .update({ sent_at: nowIso, channel, status: "invited", affiliate_id: affiliate.id, lead_id: leadId })
      .eq("id", audit!.id);

    await sb.from("ai_recommendation_audit_events").insert({
      audit_id: audit!.id,
      event_type: isReminder ? "reminder_sent" : "invite_sent",
      metadata: { channel, affiliate_id: affiliate.id, lead_id: leadId, provider_ref: providerRef, delivery_status: deliveryStatus },
    });

    await sb.from("affiliate_lead_events").insert({
      affiliate_id: affiliate.id,
      lead_id: leadId,
      event_type: channel === "sms" ? "unpro_sms_dispatched" : "email_sent",
      channel,
      payload: {
        audit_id: audit!.id,
        link,
        reminder: isReminder,
        delivery_status: deliveryStatus,
        // Preuve de passage par la porte canonique (audit LCAP).
        gate_audit_id: gate.gate_audit_id,
        gate_evidence_id: gate.evidence_id,
      },
    });

    await sb.from("affiliate_funnel_events").insert({
      affiliate_id: affiliate.id,
      session_id: `audit:${audit!.id}`,
      event_type: "audit_sent",
      metadata: { audit_id: audit!.id, lead_id: leadId, channel, reminder: isReminder, delivery_status: deliveryStatus },
    });

    const patch: Record<string, unknown> = {
      contact_status: "personal_sms_sent",
      last_contacted_by: affiliate.id,
      last_contacted_at: nowIso,
      updated_at: nowIso,
    };
    if (channel === "sms") patch.last_sms_at = nowIso;
    else patch.last_email_at = nowIso;
    await sb.from("contractor_leads").update(patch).eq("id", leadId);

    return json({ ok: true, audit_id: audit!.id, link, channel, delivery_status: deliveryStatus, message: text });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
