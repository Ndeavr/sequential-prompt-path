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
