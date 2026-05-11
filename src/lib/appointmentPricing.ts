/**
 * UNPRO — Intelligent Appointment Price Engine
 *
 * Computes a per-appointment price based on:
 *   industry (avg contract value, close rate, base RDV price, min/max bounds)
 *   territory (multiplier per cluster)
 *   seasonality (multiplier 0.85–1.15)
 *
 * Mirrors the DB tables `industry_pricing_profiles` and `territory_clusters`
 * so the UI can render synchronously without a network round-trip. The
 * authoritative source remains the DB; this catalog is the production seed.
 */

export interface IndustryProfile {
  slug: string;
  name: string;
  avgContractValue: number; // dollars
  avgCloseRate: number; // 0..1
  baseRdvPrice: number; // dollars
  minRdvPrice: number;
  maxRdvPrice: number;
}

export interface TerritoryCluster {
  slug: string;
  name: string;
  multiplier: number;
  citySlugs: string[];
}

const INDUSTRIES: Record<string, IndustryProfile> = {
  default:        { slug: "default",        name: "Général",          avgContractValue: 4000,  avgCloseRate: 0.35, baseRdvPrice: 120, minRdvPrice: 40,  maxRdvPrice: 500 },
  isolation:      { slug: "isolation",      name: "Isolation",        avgContractValue: 4200,  avgCloseRate: 0.42, baseRdvPrice: 145, minRdvPrice: 60,  maxRdvPrice: 300 },
  toiture:        { slug: "toiture",        name: "Toiture",          avgContractValue: 12000, avgCloseRate: 0.35, baseRdvPrice: 320, minRdvPrice: 150, maxRdvPrice: 800 },
  pavage:         { slug: "pavage",         name: "Pavage",           avgContractValue: 8500,  avgCloseRate: 0.38, baseRdvPrice: 240, minRdvPrice: 100, maxRdvPrice: 600 },
  paysagement:    { slug: "paysagement",    name: "Paysagement",      avgContractValue: 3500,  avgCloseRate: 0.40, baseRdvPrice: 110, minRdvPrice: 45,  maxRdvPrice: 250 },
  electricite:    { slug: "electricite",    name: "Électricien",      avgContractValue: 900,   avgCloseRate: 0.55, baseRdvPrice: 55,  minRdvPrice: 30,  maxRdvPrice: 150 },
  plomberie:      { slug: "plomberie",      name: "Plomberie",        avgContractValue: 850,   avgCloseRate: 0.55, baseRdvPrice: 65,  minRdvPrice: 30,  maxRdvPrice: 180 },
  peinture:       { slug: "peinture",       name: "Peinture",         avgContractValue: 4500,  avgCloseRate: 0.45, baseRdvPrice: 90,  minRdvPrice: 40,  maxRdvPrice: 220 },
  chauffage:      { slug: "chauffage",      name: "Chauffage",        avgContractValue: 9500,  avgCloseRate: 0.40, baseRdvPrice: 180, minRdvPrice: 70,  maxRdvPrice: 450 },
  renovation:     { slug: "renovation",     name: "Rénovation",       avgContractValue: 15000, avgCloseRate: 0.30, baseRdvPrice: 350, minRdvPrice: 150, maxRdvPrice: 800 },
  excavation:     { slug: "excavation",     name: "Excavation",       avgContractValue: 15000, avgCloseRate: 0.32, baseRdvPrice: 380, minRdvPrice: 180, maxRdvPrice: 800 },
  "lavage-vitres":{ slug: "lavage-vitres",  name: "Lavage de vitres", avgContractValue: 450,   avgCloseRate: 0.60, baseRdvPrice: 35,  minRdvPrice: 25,  maxRdvPrice: 80 },
};

const TERRITORIES: TerritoryCluster[] = [
  { slug: "montreal-centre",   name: "Montréal centre",   multiplier: 1.35, citySlugs: ["montreal","ville-marie","plateau-mont-royal","rosemont","le-sud-ouest","outremont"] },
  { slug: "laval",             name: "Laval",             multiplier: 1.15, citySlugs: ["laval"] },
  { slug: "rive-sud",          name: "Rive-Sud",          multiplier: 1.10, citySlugs: ["longueuil","brossard","saint-lambert","boucherville","saint-hubert"] },
  { slug: "rive-nord",         name: "Rive-Nord",         multiplier: 1.08, citySlugs: ["terrebonne","mascouche","repentigny","blainville","mirabel","saint-jerome"] },
  { slug: "quebec-ville",      name: "Québec",            multiplier: 1.05, citySlugs: ["quebec","levis","sainte-foy"] },
  { slug: "regions-eloignees", name: "Régions éloignées", multiplier: 0.82, citySlugs: [] },
];

const DEFAULT_TERRITORY: TerritoryCluster = {
  slug: "default", name: "Standard", multiplier: 1.0, citySlugs: [],
};

export function getIndustryProfile(slug?: string | null): IndustryProfile {
  if (!slug) return INDUSTRIES.default;
  const key = slug.toLowerCase().trim();
  return INDUSTRIES[key] ?? INDUSTRIES.default;
}

export function getTerritoryCluster(citySlug?: string | null): TerritoryCluster {
  if (!citySlug) return DEFAULT_TERRITORY;
  const key = citySlug.toLowerCase().trim();
  for (const t of TERRITORIES) {
    if (t.citySlugs.includes(key)) return t;
  }
  return DEFAULT_TERRITORY;
}

export interface RdvPriceResult {
  unitPrice: number;          // dollars per appointment
  industry: IndustryProfile;
  territory: TerritoryCluster;
  seasonalityMultiplier: number;
  avgContractValue: number;
  avgCloseRate: number;
}

function getSeasonalityMultiplier(industrySlug: string): number {
  // Simple seasonal hint per industry. Returns 0.85..1.15.
  const month = new Date().getMonth() + 1; // 1..12
  const summer = month >= 5 && month <= 9;
  const winter = month === 12 || month <= 3;
  switch (industrySlug) {
    case "toiture":
    case "pavage":
    case "paysagement":
      return summer ? 1.12 : winter ? 0.88 : 1.0;
    case "chauffage":
    case "isolation":
      return winter ? 1.12 : summer ? 0.92 : 1.0;
    default:
      return 1.0;
  }
}

export function computeRdvPrice(opts: {
  industrySlug?: string | null;
  citySlug?: string | null;
}): RdvPriceResult {
  const industry = getIndustryProfile(opts.industrySlug);
  const territory = getTerritoryCluster(opts.citySlug);
  const seasonalityMultiplier = getSeasonalityMultiplier(industry.slug);
  const raw = industry.baseRdvPrice * territory.multiplier * seasonalityMultiplier;
  const unitPrice = Math.max(industry.minRdvPrice, Math.min(industry.maxRdvPrice, Math.round(raw)));
  return {
    unitPrice,
    industry,
    territory,
    seasonalityMultiplier,
    avgContractValue: industry.avgContractValue,
    avgCloseRate: industry.avgCloseRate,
  };
}

export interface PackTier {
  size: number;
  label: string;
  unitPrice: number;        // dollars
  totalPrice: number;       // dollars
  unitPriceCents: number;   // legacy compat
  totalPriceCents: number;  // legacy compat
  savingsPercent: number;
  // ROI projection
  estimatedClosedDeals: number;
  estimatedRevenue: number;
}

const VOLUME_DISCOUNTS: Array<{ size: number; discount: number }> = [
  { size: 5,  discount: 0 },
  { size: 10, discount: 0.10 },
  { size: 25, discount: 0.18 },
  { size: 50, discount: 0.25 },
];

export function computePackTiers(price: RdvPriceResult): PackTier[] {
  return VOLUME_DISCOUNTS.map(({ size, discount }) => {
    const unit = Math.round(price.unitPrice * (1 - discount));
    const total = unit * size;
    const closed = Math.round(size * price.avgCloseRate);
    return {
      size,
      label: `${size} rendez-vous`,
      unitPrice: unit,
      totalPrice: total,
      unitPriceCents: unit * 100,
      totalPriceCents: total * 100,
      savingsPercent: Math.round(discount * 100),
      estimatedClosedDeals: closed,
      estimatedRevenue: closed * price.avgContractValue,
    };
  });
}

export interface PackPricingResult {
  baseUnitPriceCents: number;
  baseUnitPrice: number;
  tiers: PackTier[];
  industry: IndustryProfile;
  territory: TerritoryCluster;
  avgContractValue: number;
  avgCloseRate: number;
  // legacy fields kept for compatibility
  tradeSlug: string;
  citySlug: string;
}

/**
 * Backward-compatible API. Now driven by the intelligent engine.
 */
export function calculatePackPricing(
  tradeSlug: string = "default",
  citySlug: string = ""
): PackPricingResult {
  const price = computeRdvPrice({ industrySlug: tradeSlug, citySlug });
  const tiers = computePackTiers(price);
  return {
    baseUnitPrice: price.unitPrice,
    baseUnitPriceCents: price.unitPrice * 100,
    tiers,
    industry: price.industry,
    territory: price.territory,
    avgContractValue: price.avgContractValue,
    avgCloseRate: price.avgCloseRate,
    tradeSlug,
    citySlug,
  };
}

// Re-export the canonical formatter so legacy `formatCents` callers keep working.
import { formatPriceCents, formatPrice } from "./formatPrice";
export { formatPrice, formatPriceCents };

/** @deprecated Use formatPriceCents from "@/lib/formatPrice" instead. */
export const formatCents = formatPriceCents;
