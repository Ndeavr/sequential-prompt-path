/**
 * UNPRO — Parité devis ↔ écran ↔ Stripe et alias métier (STAGED, non déployé).
 * Destination après approbation : supabase/functions/_shared/pricingParity.ts
 * Module pur : aucune E/S.
 */

/** Catégories canoniques EXISTANTES de appointment_pricing_benchmarks. */
const BENCHMARK_ALIASES: Array<[RegExp, string]> = [
  [/^isolation(-|$)/, "isolation"],
  [/^(toiture|toitures|couvreur|couvreurs|refection-de-toiture)(-|$)/, "toiture"],
  [/^(thermopompe|thermopompes|pompe-a-chaleur|pompes-a-chaleur)(-|$)/, "thermopompe"],
  [/^gouttieres?(-|$)/, "gouttieres"],
  [/^(pave-uni|paves-unis)(-|$)/, "pave-uni"],
  [/^(amenagement-paysager|paysagement|paysagiste)(-|$)/, "amenagement-paysager"],
  [/^(tonte-pelouse|tonte-de-pelouse|tonte)(-|$)/, "tonte-pelouse"],
  [/^excavation(-|$)/, "excavation"],
];

/**
 * Métier normalisé (slug) → catégorie de repère tarifaire interne, ou null.
 * Sert UNIQUEMENT à lire appointment_pricing_benchmarks : la capacité, les
 * territoires et les droits restent sur le métier déclaré exact.
 */
export function benchmarkCategory(tradeSlug: string | null | undefined): string | null {
  const s = String(tradeSlug ?? "").trim().toLowerCase();
  if (!s) return null;
  for (const [re, cat] of BENCHMARK_ALIASES) if (re.test(s)) return cat;
  return null;
}

/** TPS 5 % + TVQ 9,975 %, arrondies PAR LIGNE comme les tax_rates Stripe. */
export function quebecLineTaxes(cents: number) {
  const b = Math.max(0, Math.round(cents));
  const gst = Math.round(b * 0.05);
  const qst = Math.round(b * 0.09975);
  return { base: b, gst, qst, total: b + gst + qst };
}

export interface QuoteCheckoutLines {
  planCents: number;
  presenceIncluded: boolean;
  presenceCents: number;
  packCents?: number;
  profileFeeCents?: number;
}

/** Montant dû au premier paiement et montant récurrent, taxes incluses. */
export function quoteCheckoutTotals(l: QuoteCheckoutLines) {
  const lines = [l.planCents, l.presenceIncluded ? l.presenceCents : 0, l.packCents ?? 0, l.profileFeeCents ?? 0].filter((c) => c > 0);
  const today = lines.reduce((s, c) => s + quebecLineTaxes(c).total, 0);
  return { today_cents: today, recurring_cents: quebecLineTaxes(l.planCents).total };
}

export type ParityVerdict =
  | { ok: true; compared: boolean }
  | { ok: false; code: "presence_mismatch" | "checkout_total_mismatch"; expected_today_cents: number; displayed_today_cents: number | null };

/**
 * Compare ce que l'écran a montré avec ce que le serveur va facturer.
 * Champs absents (ancien client) : non comparés, jamais présumés égaux à tort.
 */
export function checkoutParity(
  displayed: { presenceIncluded?: unknown; todayCents?: unknown },
  server: QuoteCheckoutLines,
): ParityVerdict {
  const expected = quoteCheckoutTotals(server).today_cents;
  const shownToday = typeof displayed.todayCents === "number" && Number.isFinite(displayed.todayCents) ? Math.round(displayed.todayCents) : null;
  if (typeof displayed.presenceIncluded === "boolean" && displayed.presenceIncluded !== server.presenceIncluded) {
    return { ok: false, code: "presence_mismatch", expected_today_cents: expected, displayed_today_cents: shownToday };
  }
  if (shownToday !== null && shownToday !== expected) {
    return { ok: false, code: "checkout_total_mismatch", expected_today_cents: expected, displayed_today_cents: shownToday };
  }
  return { ok: true, compared: shownToday !== null || typeof displayed.presenceIncluded === "boolean" };
}

/** Champs internes (sources, pondérations, marges) retirés de la lecture publique d'un devis invité. */
const INTERNAL_EXPLANATION_KEYS = [
  "appointment_unit_basis", "appointment_unit_price_cents", "appointment_unit_status",
  "volume_discount_rate", "volume_discount_cents", "margin", "extra_appointment",
  "budget_solve", "pack_solve", "exclusivity",
];
export function publicQuoteView<T extends Record<string, unknown>>(quote: T | null): T | null {
  if (!quote) return null;
  const pe = quote.pricing_explanation;
  if (!pe || typeof pe !== "object") return quote;
  const copy: Record<string, unknown> = { ...(pe as Record<string, unknown>) };
  for (const k of INTERNAL_EXPLANATION_KEYS) delete copy[k];
  return { ...quote, pricing_explanation: copy };
}
