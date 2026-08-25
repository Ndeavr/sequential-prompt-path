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

/** Premier contact SMS — profil déjà préparé + offre 350 $. */
export function firstTouchSms(businessName: string): string {
  const name = (businessName || "votre entreprise").trim().slice(0, 40);
  return (
    `Bonjour, UNPRO a préparé le profil d'entreprise de ${name} pour que les propriétaires ` +
    `et les IA de recherche la comprennent. ${OFFER.headline}. ${OFFER.payment_note}`
  );
}

/**
 * Premier contact SMS — objectif curiosité → score IA GRATUIT.
 * AUCUN prix, paiement, abonnement ni nombre de rendez-vous garantis.
 * Le lien mène à l'Audit IA personnalisé de l'entreprise (/unpro/audit/:token).
 */
export function firstTouchScoreSms(businessName: string): string {
  const name = (businessName || "votre entreprise").trim().slice(0, 40);
  return (
    `Curieux de savoir si ${name} est recommandée par l'IA? ` +
    `UNPRO a analysé votre présence. Découvrez gratuitement votre score actuel :`
  );
}

/** Relance — même promesse, aucune nouvelle offre. */
export function secondTouchSms(businessName: string): string {
  const name = (businessName || "votre entreprise").trim().slice(0, 40);
  return (
    `Je vous renvoie le lien pour voir le profil UNPRO de ${name}. ` +
    `${OFFER.headline}. ${OFFER.payment_note}`
  );
}

/** Récupération d'un clic sans suite. */
export function clickRecoverySms(businessName: string): string {
  const name = (businessName || "votre entreprise").trim().slice(0, 40);
  return (
    `UNPRO — ${name} : votre profil est prêt. ${OFFER.headline}. ${OFFER.payment_note}`
  );
}

export function emailSubject(businessName: string): string {
  const name = (businessName || "votre entreprise").trim();
  return `${name} — votre profil UNPRO est prêt (dès ${OFFER.price_label})`;
}

export function emailHtml(businessName: string, link: string): string {
  const name = (businessName || "votre entreprise").trim();
  return `
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f0;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;padding:32px;max-width:560px;">
          <tr><td>
            <p style="font-size:14px;color:#666;margin:0 0 16px 0;letter-spacing:0.06em;text-transform:uppercase;">UNPRO — Concierge Décisif</p>
            <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px 0;color:#111;">Bonjour ${name},</h1>
            <p style="font-size:16px;line-height:1.55;margin:0 0 16px 0;">UNPRO a préparé gratuitement le profil d'entreprise de <strong>${name}</strong> afin que les propriétaires et les IA de recherche comprennent vos services au Québec.</p>
            <p style="font-size:16px;line-height:1.55;margin:0 0 24px 0;"><strong>${OFFER.headline}.</strong> ${OFFER.payment_note}</p>
            <p style="margin:0 0 24px 0;">
              <a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:600;font-size:16px;">${OFFER.cta}</a>
            </p>
            <p style="font-size:13px;line-height:1.5;color:#666;margin:0 0 12px 0;">Ou copiez ce lien dans votre navigateur :<br /><a href="${link}" style="color:#666;">${link}</a></p>
            <p style="font-size:12px;line-height:1.5;color:#999;margin:0;">${OFFER.disclaimer}</p>
          </td></tr>
        </table>
        <p style="font-size:12px;color:#999;margin:16px 0 0 0;">UNPRO — plateforme d'intelligence résidentielle québécoise · unpro.ca</p>
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
