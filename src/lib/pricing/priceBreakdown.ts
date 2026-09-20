/**
 * UNPRO — Détail transparent du plan personnalisé.
 *
 * Règle unique : le détail affiché est une identité mathématique exacte.
 *   (abonnement + rendez-vous supplémentaires − rabais de volume
 *    + exclusivité + visibilité IA) × multiplicateur
 *   + ajustement = prix mensuel final
 *
 * AUCUN plafond mensuel universel. Un volume réellement demandé est facturé
 * à son vrai prix, réduit uniquement par un rabais de volume affiché.
 * Le seul ajustement possible est explicite (budget mensuel choisi, plancher
 * de service, forfait fixe, marché indisponible) et toujours visible.
 * Les objectifs proviennent uniquement du dossier confirmé : aucune valeur
 * par défaut ne remplace une donnée saisie par l'entrepreneur.
 */

export interface PriceIdentity {
  target_appointments: number;
  requested_appointments?: number;
  base_platform_cents: number;
  appointment_unit_price_cents?: number;
  appointment_unit_status?: string;
  extra_appointments?: number;
  volume_discount_rate?: number;
  volume_discount_cents?: number;
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
  kind: "fee" | "discount" | "subtotal" | "multiplier" | "adjustment" | "total";
}

const ADJUSTMENT_LABELS: Record<string, string> = {
  budget_mensuel_choisi: "Budget mensuel choisi",
  plancher_plan_personnalise: "Minimum de service",
  forfait_fixe: "Forfait à montant fixe",
  marche_indisponible: "Marché indisponible — plan d'attente",
  ajustement_plan_personnalise: "Ajustement plan personnalisé",
};

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Reconstruit l'identité tarifaire, même pour un devis calculé avant la correction. */
export function resolvePriceIdentity(quote: QuoteLike): PriceIdentity {
  const stored = quote.breakdown?.price_identity;
  const base = n(stored?.base_platform_cents ?? quote.base_platform_fee);
  const appt = n(stored?.appointment_package_cents ?? quote.appointment_package_fee);
  const discount = n(stored?.volume_discount_cents);
  const excl = n(stored?.exclusivity_cents ?? quote.exclusivity_fee);
  const aipp = n(stored?.aipp_cents ?? quote.aipp_optimization_fee);
  const subtotal = n(stored?.subtotal_cents ?? base + appt + discount + excl + aipp);
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
    appointment_unit_price_cents: stored?.appointment_unit_price_cents,
    appointment_unit_status: stored?.appointment_unit_status,
    extra_appointments: stored?.extra_appointments,
    volume_discount_rate: stored?.volume_discount_rate,
    volume_discount_cents: discount,
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

const unitLabel = (cents?: number) =>
  typeof cents === "number" && cents > 0 ? ` à ${Math.round(cents / 100)} $ chacun` : "";

/** Lignes affichables. La somme vérifie toujours le total final. */
export function buildBreakdownLines(quote: QuoteLike): BreakdownLine[] {
  const id = resolvePriceIdentity(quote);
  const lines: BreakdownLine[] = [
    { label: "Abonnement du forfait", cents: id.base_platform_cents, kind: "fee" },
  ];
  if (id.appointment_package_cents > 0) {
    const count = id.extra_appointments ?? id.target_appointments;
    lines.push({
      label: `Rendez-vous supplémentaires (${count}${unitLabel(id.appointment_unit_price_cents)})`,
      cents: id.appointment_package_cents,
      kind: "fee",
    });
  }
  if ((id.volume_discount_cents ?? 0) !== 0) {
    const pct = Math.round((id.volume_discount_rate ?? 0) * 100);
    lines.push({
      label: `Rabais de volume${pct ? ` (−${pct} %)` : ""}`,
      cents: id.volume_discount_cents ?? 0,
      kind: "discount",
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

/* ---------- Vue commerciale (écran entrepreneur) ---------- */

export interface CommercialLine {
  label: string;
  sublabel?: string;
  cents: number;
}

export interface CommercialSummary {
  lines: CommercialLine[];
  total_cents: number;
  /** Phrase affichée quand l'entrepreneur a fixé lui-même un budget mensuel. */
  budget_note?: string;
  /** Vrai quand aucun tarif fiable n'existe pour ce métier : abonnement seul. */
  appointments_unavailable: boolean;
}

export interface CommercialContext {
  trade?: string | null;
  city?: string | null;
  plan_label?: string | null;
  monthly_budget_cents?: number | null;
  guaranteed_appointments?: number | null;
}

const money = (cents: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
    .format(Math.round(cents / 100));

/**
 * Détail commercial : uniquement ce que l'entrepreneur comprend.
 * Aucun sous-total, multiplicateur, plafond ni ajustement interne.
 */
export function buildCommercialLines(
  quote: QuoteLike,
  ctx: CommercialContext = {},
): CommercialSummary {
  const id = resolvePriceIdentity(quote);
  const lines: CommercialLine[] = [
    {
      label: ctx.plan_label ? `Abonnement UNPRO — forfait ${ctx.plan_label}` : "Abonnement UNPRO",
      cents: id.base_platform_cents,
    },
  ];

  const count = id.extra_appointments ?? 0;
  const unavailable = id.appointment_unit_status === "unavailable" || count === 0;
  if (count > 0 && id.appointment_package_cents > 0) {
    const where = [ctx.trade, ctx.city].filter(Boolean).join(", ");
    const net = id.appointment_package_cents + (id.volume_discount_cents ?? 0);
    const pct = Math.round((id.volume_discount_rate ?? 0) * 100);
    const unit = id.appointment_unit_price_cents;
    const details = [
      typeof unit === "number" && unit > 0 ? `${money(unit)} par rendez-vous` : null,
      pct > 0 ? `rabais de volume −${pct} % inclus` : null,
    ].filter(Boolean);
    lines.push({
      label: `${count} rendez-vous exclusifs${where ? ` en ${where}` : ""}`,
      sublabel: details.length ? details.join(", ") : undefined,
      cents: net,
    });
  }

  if (id.aipp_cents > 0) {
    lines.push({ label: "Visibilité IA", cents: id.aipp_cents });
  }
  if (id.exclusivity_cents > 0) {
    lines.push({ label: "Exclusivité territoriale", cents: id.exclusivity_cents });
  }

  const listed = lines.reduce((s, l) => s + l.cents, 0);
  // Le total affiché est TOUJOURS le montant réellement facturé.
  // Tout écart de calcul interne se règle sur l'abonnement, jamais en ligne cachée.
  const diff = id.final_price_cents - listed;
  if (diff !== 0 && lines.length) lines[0].cents += diff;

  const budget = ctx.monthly_budget_cents;
  const guaranteed = ctx.guaranteed_appointments ?? id.target_appointments;
  const budget_note =
    typeof budget === "number" && budget > 0 && guaranteed > 0
      ? `Votre budget de ${money(budget)}/mois permet ${guaranteed} rendez-vous exclusifs par mois dans votre marché.`
      : undefined;

  return {
    lines,
    total_cents: id.final_price_cents,
    budget_note,
    appointments_unavailable: unavailable,
  };
}
