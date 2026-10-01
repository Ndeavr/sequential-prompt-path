/**
 * UNPRO — Miroir serveur de `src/lib/copy/offer350.ts`.
 *
 * SOURCE UNIQUE de la formulation sortante (SMS + courriel).
 * Avant calcul, l'offre est toujours annoncée « jusqu'à 5 » — jamais
 * « 5 rendez-vous pour 350 $ », qui serait une promesse non calculée.
 *
 * INTERDIT dans tout message sortant : « 1 $ », « activation 1 $ »,
 * « 7 jours pour 1 $ ». L'offre d'entrée est le pack 350 $, paiement unique.
 */

export const OFFER = {
  price_label: "350 $",
  price_cents: 35000,
  max_appointments: 5,
  headline: "Jusqu'à 5 rendez-vous exclusifs garantis dès 350 $",
  payment_note: "Paiement unique. Aucun abonnement.",
  disclaimer:
    "Le nombre réel de rendez-vous garantis dépend de votre domaine, de votre territoire et de la capacité disponible.",
  cta: "Voir ce que 350 $ peut me garantir",
} as const;

/**
 * Version de copie suivie par cohorte (metadata.copy_version).
 * v2 (2026-10-01) : aucune affirmation d'audit, aucun prix ni rendez-vous
 * promis — la proposition est calculée par le serveur après les objectifs.
 */
export const COPY_VERSION = "agreement_v2_2026-10-01";

const nm = (b: string, max = 40) => (b || "votre entreprise").trim().slice(0, max);

/** Premier contact SMS — proposition personnalisée, lien direct ajouté par l'appelant. */
export function firstTouchSms(businessName: string): string {
  return (
    `Bonjour ${nm(businessName)}, UNPRO vise des rendez-vous exclusifs adaptés à vos services ` +
    `et à votre territoire, sans soumissions partagées. Voyez la proposition pour votre entreprise :`
  );
}

/** Alias historique : même message v2 (plus d'affirmation « nous avons analysé »). */
export function firstTouchScoreSms(businessName: string): string {
  return firstTouchSms(businessName);
}

/** Relance — même proposition, aucune nouvelle offre. */
export function secondTouchSms(businessName: string): string {
  return (
    `${nm(businessName)} : je vous renvoie le lien vers votre proposition UNPRO. ` +
    `Vous confirmez votre entreprise et vos objectifs; le forfait est calculé selon votre capacité :`
  );
}

/** Récupération d'un clic sans suite. */
export function clickRecoverySms(businessName: string): string {
  return (
    `${nm(businessName)} : votre proposition UNPRO reste disponible. ` +
    `Deux minutes pour confirmer vos objectifs et voir le prix exact :`
  );
}

export function emailSubject(businessName: string): string {
  return `${nm(businessName, 60)} — votre proposition UNPRO`;
}

export function emailHtml(businessName: string, link: string): string {
  const name = nm(businessName, 80);
  return `
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f0;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;padding:32px;max-width:560px;">
          <tr><td>
            <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px 0;color:#111;">Bonjour ${name},</h1>
            <p style="font-size:16px;line-height:1.55;margin:0 0 16px 0;">UNPRO vise des rendez-vous exclusifs adaptés à vos services et à votre territoire — moins de soumissions perdues et de déplacements inutiles, jamais de demandes partagées entre plusieurs entrepreneurs.</p>
            <p style="font-size:16px;line-height:1.55;margin:0 0 24px 0;">Vous confirmez votre entreprise et vos objectifs; UNPRO calcule ensuite l'entente de départ adaptée à votre capacité du mois prochain, avec le prix exact avant tout paiement.</p>
            <p style="margin:0 0 24px 0;">
              <a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:600;font-size:16px;">Voir ma proposition</a>
            </p>
            <p style="font-size:13px;line-height:1.5;color:#666;margin:0 0 12px 0;">Ou copiez ce lien :<br /><a href="${link}" style="color:#666;">${link}</a></p>
          </td></tr>
        </table>
        <p style="font-size:12px;color:#999;margin:16px 0 0 0;">UNPRO — plateforme d'intelligence résidentielle québécoise · unpro.ca · Pour ne plus recevoir nos messages, répondez « STOP ».</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

// ─── Founder offer (local services & professionals) — 12 mois gratuits ───
// Outreach templates ONLY; nothing here sends. All CASL / opt-out /
// frequency gates stay in the canonical send workers.
export const FOUNDER_OFFER = {
  headline: "12 mois gratuitement — membre fondateur UNPRO",
  renewal_note:
    "Après 12 mois gratuits : 350 $/an, uniquement avec votre consentement. Aucun frais par mise en relation pendant le membership.",
  conditions:
    "Offre de lancement réservée aux premiers membres admissibles de chaque ville. Certaines conditions s'appliquent.",
} as const;

/** SMS first-touch for Founder-eligible prospects (services/professionnels). */
export function founderFirstTouchSms(businessName: string): string {
  const name = (businessName || "votre entreprise").trim().slice(0, 40);
  return (
    `${name} : UNPRO ouvre son offre de lancement dans votre ville. ` +
    `Les premiers membres fondateurs admissibles obtiennent 12 mois gratuitement (valeur 350 $/an). Vérifiez votre admissibilité :`
  );
}

export function founderEmailSubject(businessName: string): string {
  return `${businessName} — membre fondateur UNPRO : 12 mois offerts dans votre ville`;
}

export function founderEmailHtml(businessName: string, link: string): string {
  const safe = businessName.replace(/[<>&"]/g, "");
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:32px;">
      <tr><td>
        <p style="font-size:13px;color:#666;margin:0 0 8px 0;">UNPRO · Offre de lancement</p>
        <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px 0;color:#111;">${safe} : devenez membre fondateur de votre ville</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;color:#333;">Soyez parmi les 10 premiers membres UNPRO de votre ville et profitez de <strong>12 mois gratuitement</strong>. UNPRO vous recommande aux propriétaires au bon moment — sans frais par mise en relation pendant votre membership.</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 24px 0;color:#333;">${FOUNDER_OFFER.renewal_note}</p>
        <p style="margin:0 0 24px 0;">
          <a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:600;font-size:16px;">Réserver ma place gratuitement</a>
        </p>
        <p style="font-size:12px;line-height:1.5;color:#999;margin:0;">${FOUNDER_OFFER.conditions}</p>
      </td></tr>
    </table>
    <p style="font-size:12px;color:#999;margin:16px 0 0 0;">UNPRO — plateforme d'intelligence résidentielle québécoise · unpro.ca</p>
  </td></tr></table>
</body></html>`;
}


// ─── Offre « 1 an gratuit » — entreprises de services résidentiels locaux ───
// Aucune rareté n'est écrite sans capacité réelle : `remaining` provient
// toujours de `public.local_service_offer_status` (calcul serveur).

export interface FreeYearContext {
  businessName: string;
  city: string;
  categoryName: string;
  link: string;
  remaining: number;
  cap: number;
  firstName?: string | null;
}

/**
 * SMS premier contact — offre 12 mois gratuits.
 * Personnalisation uniquement à partir de faits vérifiés (entreprise, service,
 * ville). Aucune rareté chiffrée sans capacité calculée en base.
 */
export function localServiceFreeYearSms(ctx: FreeYearContext): string {
  const who = (ctx.firstName || ctx.businessName || "votre entreprise").trim().slice(0, 40);
  const service = (ctx.categoryName || "").trim().toLowerCase();
  const found = service && ctx.city
    ? `J'ai trouvé votre service de ${service} à ${ctx.city}.`
    : ctx.city
    ? `J'ai trouvé ${who} à ${ctx.city}.`
    : `J'ai trouvé ${who}.`;
  const scarcity = ctx.remaining > 0
    ? `Nous offrons 12 mois gratuits aux ${ctx.cap} premières entreprises de services admissibles de la ville (${ctx.remaining} place${ctx.remaining > 1 ? "s" : ""} restante${ctx.remaining > 1 ? "s" : ""})`
    : "Nous offrons 12 mois gratuits aux premières entreprises de services admissibles de la ville";
  return (
    `Bonjour ${who} 👋 ${found} UNPRO aide les propriétaires à trouver et réserver des services locaux au bon moment. ` +
    `${scarcity} — aucune carte de crédit. Activer :`
  );
}


export function localServiceFreeYearEmailSubject(ctx: FreeYearContext): string {
  return `${ctx.businessName} — ${ctx.categoryName} à ${ctx.city} : votre fiche UNPRO est prête`;
}

export function localServiceFreeYearEmailHtml(ctx: FreeYearContext): string {
  const safe = (v: string) => v.replace(/[<>&"]/g, "");
  const scarcity = ctx.remaining > 0
    ? `L'inscription est gratuite pendant 1 an pour les ${ctx.cap} premières entreprises de la catégorie dans la ville. Il reste ${ctx.remaining} place${ctx.remaining > 1 ? "s" : ""}.`
    : "Vous pouvez réclamer gratuitement votre fiche et être inscrit à la prochaine ouverture de places.";
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:32px;">
      <tr><td>
        <p style="font-size:13px;color:#666;margin:0 0 8px 0;">UNPRO · ${safe(ctx.categoryName)} — ${safe(ctx.city)}</p>
        <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px 0;color:#111;">Bonjour ${safe(ctx.firstName || ctx.businessName)},</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;color:#333;">UNPRO ouvre actuellement ${safe(ctx.categoryName.toLowerCase())} à ${safe(ctx.city)}. ${scarcity}</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 24px 0;color:#333;">Nous avons préparé la fiche de <strong>${safe(ctx.businessName)}</strong> à partir de sources publiques. Vous pouvez la vérifier, la corriger et la réclamer gratuitement.</p>
        <p style="margin:0 0 24px 0;">
          <a href="${ctx.link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:600;font-size:16px;">Réclamer gratuitement ma fiche</a>
        </p>
        <p style="font-size:12px;line-height:1.5;color:#999;margin:0;">Aucun paiement, aucun renouvellement automatique. Répondez STOP pour ne plus recevoir nos messages.</p>
      </td></tr>
    </table>
    <p style="font-size:12px;color:#999;margin:16px 0 0 0;">UNPRO — plateforme d'intelligence résidentielle québécoise · unpro.ca</p>
  </td></tr></table>
</body></html>`;
}
