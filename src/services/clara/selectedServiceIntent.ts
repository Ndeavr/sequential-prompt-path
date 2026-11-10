/**
 * Explicit homeowner service selection from the existing owner menu.
 * Treat this as a real expressed need, not a generic chat greeting.
 * Pure helper used by the Clara conversation and focused tests.
 */
export interface SelectedServiceIntent {
  serviceLabel: string;
  openingFr: string;
}

export function parseSelectedServiceIntent(query: string | null | undefined): SelectedServiceIntent | null {
  const match = query?.trim().match(/^j['’]ai besoin du service suivant\s*:\s*(.+)$/i);
  if (!match) return null;

  const serviceLabel = match[1].trim();
  // Never interpolate unbounded or unsafe URL text into a chat message.
  if (!serviceLabel || serviceLabel.length > 120 || /[<>\x00-\x1f]/.test(serviceLabel)) return null;

  const normalized = serviceLabel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const subject = /nettoyage (?:de |des )?gouttieres/.test(normalized)
    ? "le nettoyage de vos gouttières"
    : `le service « ${serviceLabel} »`;

  return {
    serviceLabel,
    openingFr: `Vous cherchez une entreprise pour ${subject}. Dans quelle ville se trouve le bâtiment?`,
  };
}
