/**
 * Lien de prise de rendez-vous de l'AGENDA PERSONNEL DU FONDATEUR.
 * Ne pas confondre avec l'agenda d'un entrepreneur (/book/:slug) ni un agenda propriétaire.
 * Aucune URL vérifiée n'existe à ce jour : la valeur reste `null` et les pages
 * affichent un repli honnête vers /contact. Renseigner ici uniquement une URL
 * https réelle, fournie et validée par le fondateur (aucun secret).
 */
export const FOUNDER_BOOKING_URL: string | null = null;

/** Retourne une URL https valide ou null (aucun lien bidon navigable). */
export function resolveFounderBookingUrl(raw: string | null | undefined = FOUNDER_BOOKING_URL): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
