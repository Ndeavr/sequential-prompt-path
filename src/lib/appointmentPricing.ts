/**
 * UNPRO — Appointment Pack Pricing
 * Calculates à-la-carte RDV pricing based on trade/city via JVE.
 * Uses mock data until real JVE is wired.
 */

export interface PackTier {
  size: number;
  label: string;
  unitPriceCents: number;
  totalPriceCents: number;
  savingsPercent: number;
}

export interface PackPricingResult {
  baseUnitPriceCents: number;
  tiers: PackTier[];
  tradeSlug: string;
  citySlug: string;
}

// Volume discounts per pack size
const VOLUME_DISCOUNTS: Record<number, number> = {
  5: 0,
  10: 0.10,
  25: 0.18,
  50: 0.25,
};

// Mock avg job values by trade (cents) — will be replaced by JVE RPC
const MOCK_AVG_JOB_VALUES: Record<string, number> = {
  plomberie: 85000,
  electricite: 72000,
  toiture: 120000,
  renovation: 150000,
  peinture: 45000,
  chauffage: 95000,
  paysagement: 55000,
  default: 80000,
};

// RDV price = ~18% of avg job value (platform fee for qualified appointment)
const RDV_VALUE_RATIO = 0.18;

function getBaseUnitPrice(tradeSlug: string): number {
  const jobValue = MOCK_AVG_JOB_VALUES[tradeSlug] || MOCK_AVG_JOB_VALUES.default;
  return Math.round(jobValue * RDV_VALUE_RATIO);
}

export function calculatePackPricing(
  tradeSlug: string = "default",
  citySlug: string = ""
): PackPricingResult {
  const baseUnit = getBaseUnitPrice(tradeSlug);

  const tiers: PackTier[] = Object.entries(VOLUME_DISCOUNTS).map(([sizeStr, discount]) => {
    const size = parseInt(sizeStr);
    const discountedUnit = Math.round(baseUnit * (1 - discount));
    return {
      size,
      label: size <= 10 ? `${size} RDV` : `${size} RDV`,
      unitPriceCents: discountedUnit,
      totalPriceCents: discountedUnit * size,
      savingsPercent: Math.round(discount * 100),
    };
  });

  return {
    baseUnitPriceCents: baseUnit,
    tiers,
    tradeSlug,
    citySlug,
  };
}

export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars >= 1000
    ? `${(dollars / 1000).toFixed(1).replace(/\.0$/, "")}k $`
    : `${dollars.toFixed(0)} $`;
}
