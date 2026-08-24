// PROTECTED — Master outreach copy (AI Visibility narrative).
// Every email/SMS in this file follows the mandatory dual-CTA rule:
//   1. tracked CTA (a unpro.ca URL that the dispatcher will wrap through /r/{id})
//   2. reply CTA ("Répondez … OUI")
// Do NOT remove either path. The validator will block the send otherwise.

import { outreachSubjectNoun, sparseSafeGreeting, type IdentityStatus } from "./sparseLead.ts";

const PUBLIC_BASE = "https://unpro.ca";

export type OutreachContext = {
  first_name?: string | null;
  business_name?: string | null;
  slug?: string | null;
  prospect_id?: string | null;
  utm_campaign?: string | null;
  /**
   * Sparse leads (person name + phone only) must be addressed by first name and
   * must never be told we know their business.
   */
  identity_status?: IdentityStatus | null;
};

function landing(ctx: OutreachContext, campaign: string): string {
  const id = ctx.slug || ctx.prospect_id || "";
  const utm = `utm_source=outreach&utm_medium=${campaign.includes("sms") ? "sms" : "email"}&utm_campaign=${campaign}`;
  return `${PUBLIC_BASE}/pro/${id}?${utm}`;
}

function firstName(ctx: OutreachContext): string {
  const n = (ctx.first_name || "").trim();
  return n || "Bonjour";
}

function isSparse(ctx: OutreachContext): boolean {
  return ctx.identity_status ? ctx.identity_status !== "company_confirmed" : !ctx.business_name;
}

/** "Groupe X" / "votre entreprise" when confirmed, "vos services" when sparse. */
function subjectNoun(ctx: OutreachContext): string {
  return outreachSubjectNoun(
    (ctx.identity_status as IdentityStatus) ?? (ctx.business_name ? "company_confirmed" : "sparse_person"),
    ctx.business_name,
  );
}

function greeting(ctx: OutreachContext): string {
  return sparseSafeGreeting(ctx.first_name);
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAILS
// ─────────────────────────────────────────────────────────────────────────────

export type EmailCopy = { subject: string; html: string };

function emailShell(body: string, ctaUrl: string): string {
  return `
<div style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;color:#0F172A;line-height:1.65;font-size:15px;max-width:560px;margin:0 auto;padding:32px 24px;">
  ${body}
  <div style="text-align:center;margin:28px 0;">
    <a href="${ctaUrl}" style="background:#0F172A;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;display:inline-block;">
      Voir mon aperçu IA →
    </a>
  </div>
  <p style="font-size:14px;color:#374151;margin:20px 0 0;">
    Ou répondez simplement <strong style="background:#fef3c7;padding:2px 6px;border-radius:4px;">OUI</strong> à ce message — nous vous enverrons votre aperçu gratuitement.
  </p>
  <p style="font-size:12px;color:#9CA3AF;margin:32px 0 0;">L'équipe UNPRO</p>
</div>`.trim();
}

export function masterEmail1(ctx: OutreachContext): EmailCopy {
  const cta = landing(ctx, "ai_visibility_email_1");
  const body = `
<p>Bonjour,</p>
<p>De plus en plus de propriétaires demandent à l'IA :</p>
<p style="border-left:3px solid #0F172A;padding-left:14px;color:#374151;font-style:italic;">« Quel entrepreneur me recommandes-tu ? »</p>
<p>Nous analysons actuellement comment certaines entreprises du Québec apparaissent dans ces résultats.</p>
<p>${ctx.business_name ? `<strong>${ctx.business_name}</strong> a été sélectionnée` : "Vous avez été sélectionné"} pour un aperçu gratuit.</p>`.trim();
  return {
    subject: "L'IA trouve-t-elle déjà votre entreprise?",
    html: emailShell(body, cta),
  };
}

export function masterEmailFollowup3d(ctx: OutreachContext): EmailCopy {
  const cta = landing(ctx, "ai_visibility_email_followup_3d");
  const body = `
<p>Bonjour,</p>
<p>Petit suivi.</p>
<p>Les propriétaires utilisent maintenant ChatGPT, Gemini, Google AI et d'autres outils pour trouver des entrepreneurs.</p>
<p>Mais plusieurs entreprises n'apparaissent <em>jamais</em> dans ces recommandations.</p>
<p>Nous pouvons vérifier <strong>gratuitement</strong> votre visibilité.</p>`.trim();
  return {
    subject: "L'IA recommande-t-elle votre entreprise?",
    html: emailShell(body, cta),
  };
}

export function masterEmailFollowup7d(ctx: OutreachContext): EmailCopy {
  const cta = landing(ctx, "ai_visibility_email_followup_7d");
  const body = `
<p>Bonjour,</p>
<p>Même lorsque l'IA mentionne une entreprise, les informations affichées sont parfois <strong>incomplètes ou erronées</strong>.</p>
<p>Nous pouvons vous montrer exactement ce que l'IA voit aujourd'hui à propos de ${ctx.business_name ? `<strong>${ctx.business_name}</strong>` : "votre entreprise"}.</p>`.trim();
  return {
    subject: "Ce que l'IA dit de votre entreprise (en ce moment)",
    html: emailShell(body, cta),
  };
}

export const MASTER_EMAIL_SEQUENCES: Record<string, (ctx: OutreachContext) => EmailCopy> = {
  master_email_1: masterEmail1,
  master_email_followup_3d: masterEmailFollowup3d,
  master_email_followup_7d: masterEmailFollowup7d,
};

// ─────────────────────────────────────────────────────────────────────────────
// SMS
// ─────────────────────────────────────────────────────────────────────────────

export type SmsCopy = { body: string };

export function masterSms1(ctx: OutreachContext): SmsCopy {
  const cta = landing(ctx, "ai_visibility_sms_1");
  return {
    body:
    isSparse(ctx)
      ? `${greeting(ctx)},
De plus en plus de propriétaires demandent à l'IA quel entrepreneur choisir.
Voulez-vous voir si ${subjectNoun(ctx)} y apparaissent?
Répondez OUI ou consultez : ${cta}`
      : `Bonjour ${firstName(ctx)},
De plus en plus de propriétaires demandent à l'IA quel entrepreneur choisir.
Voulez-vous voir comment ${subjectNoun(ctx)} apparaît?
Répondez OUI ou consultez : ${cta}`,
  };
}

export function masterSms2(ctx: OutreachContext): SmsCopy {
  const cta = landing(ctx, "ai_visibility_sms_2");
  return {
    body:
    isSparse(ctx)
      ? `${greeting(ctx)},
L'IA recommande déjà certains entrepreneurs au Québec.
Vérifiez si vous en faites partie : ${cta}
Répondez OUI pour recevoir votre aperçu.`
      : `${firstName(ctx)},
L'IA recommande déjà certaines entreprises dans votre secteur.
Vérifiez si la vôtre en fait partie : ${cta}
Répondez OUI pour recevoir votre aperçu.`,
  };
}

export function masterSms3(ctx: OutreachContext): SmsCopy {
  const cta = landing(ctx, "ai_visibility_sms_3");
  return {
    body:
    isSparse(ctx)
      ? `Dernier suivi.
Comment ChatGPT, Google AI et Gemini parlent-ils des entrepreneurs comme vous aujourd'hui?
Voir l'aperçu : ${cta}
Ou répondez OUI.`
      : `Dernier suivi.
Comment ChatGPT, Google AI et Gemini décrivent-ils votre entreprise aujourd'hui?
Voir l'aperçu : ${cta}
Ou répondez OUI.`,
  };
}

export const MASTER_SMS_SEQUENCES: Record<string, (ctx: OutreachContext) => SmsCopy> = {
  master_sms_1: masterSms1,
  master_sms_2: masterSms2,
  master_sms_3: masterSms3,
};
