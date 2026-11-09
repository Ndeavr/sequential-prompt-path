/**
 * UNPRO — Panier personnalisé de rendez-vous (phase 2, modèle seulement).
 *
 * Un panier = lignes { service, taille, saison, quantité mensuelle }.
 * Deux registres SÉPARÉS, fournis par le serveur et validés par un admin :
 *  - définition de taille PAR MÉTIER ET PAR SERVICE (fourchette de valeur);
 *  - tarif par rendez-vous PAR MÉTIER × SERVICE × TAILLE (× saison/zone si configuré).
 * Aucune taille universelle, aucun tarif de repli : sans ligne validée, la ligne
 * reste « à confirmer » et le panier n'est pas payable. XXS n'a aucun seuil par
 * défaut. Un objectif n'est jamais un nombre inclus.
 */
import { appointmentPlanPayable } from "./pricingModes.ts";

export const BASKET_SIZES = ["xxs", "xs", "s", "m", "l", "xl", "xxl"] as const;
export type BasketSize = (typeof BASKET_SIZES)[number];
export const BASKET_SEASONS = ["printemps", "ete", "automne", "hiver"] as const;
export type BasketSeason = (typeof BASKET_SEASONS)[number];

export interface BasketLineInput {
  service_slug: string;
  size: BasketSize;
  season: BasketSeason;
  monthly_qty: number;
}

export interface TradeSizeDefinition {
  trade_slug: string;
  service_slug: string;
  size: BasketSize;
  min_value_cents: number;
  max_value_cents: number;
  validated: boolean;
}

export interface TaskSizeRate {
  trade_slug: string;
  service_slug: string;
  size: BasketSize;
  /** null = toutes saisons (seulement si configuré ainsi). */
  season: BasketSeason | null;
  /** null = tout le territoire du métier. */
  zone_slug: string | null;
  unit_price_cents: number;
  validated: boolean;
}

export type LineStatus = "priced" | "size_to_confirm" | "rate_to_confirm" | "invalid";

export interface BasketLine extends BasketLineInput {
  status: LineStatus;
  unit_price_cents: number | null;
  included_qty: number;
  line_total_cents: number | null;
}

export interface BasketQuote {
  season: BasketSeason;
  status: "payable" | "to_confirm" | "blocked";
  lines: BasketLine[];
  included_appointments: number;
  total_cents: number;
  budget_cents: number | null;
  budget_adjusted: boolean;
}

/** Saison du Québec pour un mois (1–12). */
export function seasonForMonth(month: number): BasketSeason {
  if (month >= 3 && month <= 5) return "printemps";
  if (month >= 6 && month <= 8) return "ete";
  if (month >= 9 && month <= 11) return "automne";
  return "hiver";
}

function findRate(rates: TaskSizeRate[], trade: string, l: BasketLineInput, zone: string | null): TaskSizeRate | null {
  const ok = rates.filter((r) => r.validated && r.unit_price_cents > 0 && r.trade_slug === trade && r.service_slug === l.service_slug && r.size === l.size);
  const score = (r: TaskSizeRate) => (r.season === l.season ? 2 : r.season === null ? 0 : -99) + (zone && r.zone_slug === zone ? 1 : r.zone_slug === null ? 0 : -99);
  const best = ok.map((r) => ({ r, s: score(r) })).filter((x) => x.s >= 0).sort((a, b) => b.s - a.s)[0];
  return best?.r ?? null;
}

/**
 * Compose le devis d'une saison. Plafond budgétaire : retire d'abord une unité
 * de la ligne au tarif le plus élevé, jusqu'à respecter le budget. Le résultat
 * est payable seulement si au moins un rendez-vous est inclus et que toutes
 * les lignes demandées sont tarifées.
 */
export function composeBasketQuote(input: {
  trade_slug: string;
  zone_slug?: string | null;
  season: BasketSeason;
  lines: BasketLineInput[];
  sizes: TradeSizeDefinition[];
  rates: TaskSizeRate[];
  monthly_budget_cents?: number | null;
}): BasketQuote {
  const zone = input.zone_slug ?? null;
  const lines: BasketLine[] = input.lines
    .filter((l) => l.season === input.season)
    .map((l) => {
      const qty = Math.round(Number(l.monthly_qty));
      if (!BASKET_SIZES.includes(l.size) || !Number.isFinite(qty) || qty <= 0) {
        return { ...l, status: "invalid", unit_price_cents: null, included_qty: 0, line_total_cents: null };
      }
      const size = input.sizes.find((s) => s.validated && s.trade_slug === input.trade_slug && s.service_slug === l.service_slug && s.size === l.size && s.max_value_cents >= s.min_value_cents);
      if (!size) return { ...l, monthly_qty: qty, status: "size_to_confirm", unit_price_cents: null, included_qty: 0, line_total_cents: null };
      const rate = findRate(input.rates, input.trade_slug, l, zone);
      if (!rate) return { ...l, monthly_qty: qty, status: "rate_to_confirm", unit_price_cents: null, included_qty: 0, line_total_cents: null };
      return { ...l, monthly_qty: qty, status: "priced", unit_price_cents: rate.unit_price_cents, included_qty: qty, line_total_cents: qty * rate.unit_price_cents };
    });

  const budget = input.monthly_budget_cents == null ? null : Math.max(0, Math.round(input.monthly_budget_cents));
  let adjusted = false;
  const total = () => lines.reduce((s, l) => s + (l.status === "priced" ? l.included_qty * (l.unit_price_cents ?? 0) : 0), 0);
  if (budget !== null) {
    while (total() > budget) {
      const top = lines.filter((l) => l.status === "priced" && l.included_qty > 0).sort((a, b) => (b.unit_price_cents ?? 0) - (a.unit_price_cents ?? 0))[0];
      if (!top) break;
      top.included_qty -= 1;
      adjusted = true;
    }
    for (const l of lines) if (l.status === "priced") l.line_total_cents = l.included_qty * (l.unit_price_cents ?? 0);
  }

  const included = lines.reduce((s, l) => s + l.included_qty, 0);
  const sum = total();
  const allPriced = lines.length > 0 && lines.every((l) => l.status === "priced");
  const gate = appointmentPlanPayable(sum, included);
  const status: BasketQuote["status"] = !allPriced ? "to_confirm" : gate.payable && included > 0 ? "payable" : "blocked";
  return { season: input.season, status, lines, included_appointments: included, total_cents: sum, budget_cents: budget, budget_adjusted: adjusted };
}
