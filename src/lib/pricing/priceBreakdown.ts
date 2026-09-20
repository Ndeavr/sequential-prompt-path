/**
 * UNPRO — Détail transparent du plan personnalisé.
 *
 * Règle unique : le détail affiché est une identité mathématique exacte.
 *   (base + rendez-vous + exclusivité + visibilité IA) × multiplicateur
 *   + ajustement = prix mensuel final
 *
 * L'ajustement (plafond, plancher, forfait fixe, marché indisponible) est
 * TOUJOURS affiché. Aucun rabais ni plafond caché.
 * Les objectifs proviennent uniquement du dossier confirmé : aucune valeur
 * par défaut ne remplace une donnée saisie par l'entrepreneur.
 */

export interface PriceIdentity {
  target_appointments: number;
  requested_appointments?: number;
  base_platform_cents: number;
  appointment_package_cents: number;
  exclusivity_cents: number;
  aipp_cents: number;
  subtotal_cents: number;
  market_multiplier: number;
  override_multiplier?: number;
  raw_price_cents: number;
  adjustment_cents: number;
  adjustment_reason: string | null;
  final_price_cents: number;
}

export interface QuoteLike {
  target_monthly_appointments?: number | null;
  base_platform_fee?: number | null;
  appointment_package_fee?: number | null;
  exclusivity_fee?: number | null;
  aipp_optimization_fee?: number | null;
  recommended_monthly_price: number;
  breakdown?: { price_identity?: Partial<PriceIdentity>; market_multiplier?: number } | null;
}

export interface BreakdownLine {
  label: string;
  cents?: number;
  multiplier?: number;
  kind: "fee" | "subtotal" | "multiplier" | "adjustment" | "total";
}

const ADJUSTMENT_LABELS: Record<string, string> = {
  plafond_plan_personnalise: "Plafond plan personnalisé",
  plancher_plan_personnalise: "Plancher plan personnalisé",
  forfait_fixe: "Ajustement forfait fixe",
  marche_indisponible: "Ajustement marché indisponible",
  ajustement_plan_personnalise: "Ajustement plan personnalisé",
};

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Reconstruit l'identité tarifaire, même pour un devis calculé avant la correction. */
export function resolvePriceIdentity(quote: QuoteLike): PriceIdentity {
  const stored = quote.breakdown?.price_identity;
  const base = n(stored?.base_platform_cents ?? quote.base_platform_fee);
  const appt = n(stored?.appointment_package_cents ?? quote.appointment_package_fee);
  const excl = n(stored?.exclusivity_cents ?? quote.exclusivity_fee);
  const aipp = n(stored?.aipp_cents ?? quote.aipp_optimization_fee);
  const subtotal = n(stored?.subtotal_cents ?? base + appt + excl + aipp);
  const multiplier =
    typeof stored?.market_multiplier === "number"
      ? stored.market_multiplier
      : typeof quote.breakdown?.market_multiplier === "number"
        ? quote.breakdown.market_multiplier
        : 1;
  const final = n(stored?.final_price_cents ?? quote.recommended_monthly_price);
  const raw = n(stored?.raw_price_cents ?? Math.round(subtotal * multiplier));

  return {
    target_appointments: n(stored?.target_appointments ?? quote.target_monthly_appointments),
    requested_appointments: stored?.requested_appointments,
    base_platform_cents: base,
    appointment_package_cents: appt,
    exclusivity_cents: excl,
    aipp_cents: aipp,
    subtotal_cents: subtotal,
    market_multiplier: multiplier,
    override_multiplier: stored?.override_multiplier,
    raw_price_cents: raw,
    adjustment_cents: n(stored?.adjustment_cents ?? final - raw),
    adjustment_reason:
      stored?.adjustment_reason ?? (final === raw ? null : "ajustement_plan_personnalise"),
    final_price_cents: final,
  };
}

/** Lignes affichables. La somme vérifie toujours le total final. */
export function buildBreakdownLines(quote: QuoteLike): BreakdownLine[] {
  const id = resolvePriceIdentity(quote);
  const lines: BreakdownLine[] = [
    { label: "Abonnement du forfait", cents: id.base_platform_cents, kind: "fee" },
  ];
  if (id.appointment_package_cents > 0) {
    lines.push({
      label: `Rendez-vous supplémentaires (${id.target_appointments} visés)`,
      cents: id.appointment_package_cents,
      kind: "fee",
    });
  }
  if (id.aipp_cents > 0) {
    lines.push({ label: "Optimisation visibilité IA", cents: id.aipp_cents, kind: "fee" });
  }
  if (id.exclusivity_cents > 0) {
    lines.push({ label: "Exclusivité territoriale", cents: id.exclusivity_cents, kind: "fee" });
  }
  lines.push({ label: "Sous-total", cents: id.subtotal_cents, kind: "subtotal" });
  lines.push({
    label: "Multiplicateur marché",
    multiplier: id.market_multiplier,
    kind: "multiplier",
  });
  if (id.adjustment_cents !== 0) {
    lines.push({
      label: ADJUSTMENT_LABELS[id.adjustment_reason ?? ""] ?? "Ajustement plan personnalisé",
      cents: id.adjustment_cents,
      kind: "adjustment",
    });
  }
  lines.push({ label: "Prix mensuel personnalisé", cents: id.final_price_cents, kind: "total" });
  return lines;
}

/** Vérifie l'identité : sous-total × multiplicateur + ajustement = total. */
export function breakdownIsExact(quote: QuoteLike): boolean {
  const id = resolvePriceIdentity(quote);
  const computed = Math.round(
    id.subtotal_cents * id.market_multiplier * (id.override_multiplier ?? 1),
  );
  return Math.abs(computed + id.adjustment_cents - id.final_price_cents) <= 1;
}
