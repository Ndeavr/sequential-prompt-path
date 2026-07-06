/**
 * Average CAD ticket per category, used to convert project capacity → revenue.
 * Values derived from contractor_market_opportunity averages (estimated_revenue / homeowner_count)
 * for common categories in the QC market.
 */
export const AVG_TICKET_BY_CATEGORY: Record<string, number> = {
  Isolation: 5400,
  Toiture: 9800,
  Plomberie: 1800,
  Électricité: 2400,
  Rénovation: 18500,
  Peinture: 3200,
  Chauffage: 5600,
  Climatisation: 4800,
  Menuiserie: 4200,
};

export const DEFAULT_AVG_TICKET = 4500;

export function avgTicketFor(category?: string | null): number {
  if (!category) return DEFAULT_AVG_TICKET;
  return AVG_TICKET_BY_CATEGORY[category] ?? DEFAULT_AVG_TICKET;
}

/** Estimated close rate per category (0-1) used to derive today's jobs from reviews. */
export const CLOSE_RATE_BY_CATEGORY: Record<string, number> = {
  Isolation: 0.42,
  Toiture: 0.35,
  Plomberie: 0.55,
  Électricité: 0.5,
  Rénovation: 0.28,
  Peinture: 0.45,
  Chauffage: 0.4,
  Climatisation: 0.4,
  Menuiserie: 0.4,
};

export function closeRateFor(category?: string | null): number {
  if (!category) return 0.4;
  return CLOSE_RATE_BY_CATEGORY[category] ?? 0.4;
}
