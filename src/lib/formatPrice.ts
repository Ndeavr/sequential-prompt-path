/**
 * UNPRO — Canonical price formatter (fr-CA)
 * Replaces every "k$" / "1.3k$" / "$130" with "1 300 $", "130 $", etc.
 * Always uses non-breaking space and trailing dollar sign per fr-CA convention.
 */

const NBSP = "\u00A0";

const FR_CA = new Intl.NumberFormat("fr-CA", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  useGrouping: true,
});

/** Format an integer dollar amount as "1 300 $" (no decimals, fr-CA grouping). */
export function formatPrice(dollars: number | null | undefined): string {
  if (dollars == null || !Number.isFinite(dollars)) return `0${NBSP}$`;
  const n = FR_CA.format(Math.round(dollars)).replace(/\s/g, NBSP);
  return `${n}${NBSP}$`;
}

/** Format a cents amount as dollars in fr-CA. */
export function formatPriceCents(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(cents)) return `0${NBSP}$`;
  return formatPrice(cents / 100);
}

/** "≈ 130 $ / rendez-vous qualifié" */
export function formatPricePerRdv(dollars: number): string {
  return `≈ ${formatPrice(dollars)} / rendez-vous qualifié`;
}

/** Same, from cents. */
export function formatPricePerRdvCents(cents: number): string {
  return formatPricePerRdv(cents / 100);
}
