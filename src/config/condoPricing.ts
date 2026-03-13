/**
 * UNPRO Condos — Pricing tiers with real Stripe IDs
 * All prices in CAD, taxes included (14.975% TPS+TVQ)
 */
export const CONDO_PRICING_TIERS = [
  {
    units: "2–4 unités",
    minUnits: 2,
    maxUnits: 4,
    priceTaxIncluded: 150,
    priceId: "price_1TAaMwCvZwK1QnPVFcqGb0fG",
    productId: "prod_U8s7W5eVEIlzkQ",
    perUnit: "~38 $ / unité",
  },
  {
    units: "5–10 unités",
    minUnits: 5,
    maxUnits: 10,
    priceTaxIncluded: 300,
    priceId: "price_1TAaMyCvZwK1QnPVzMClie4G",
    productId: "prod_U8s7MiJc9AEQ3V",
    perUnit: "~30 $ / unité",
  },
  {
    units: "11–20 unités",
    minUnits: 11,
    maxUnits: 20,
    priceTaxIncluded: 500,
    priceId: "price_1TAaMzCvZwK1QnPVkLBKyI5R",
    productId: "prod_U8s7Op9bYG4rd8",
    perUnit: "~25 $ / unité",
  },
  {
    units: "21–50 unités",
    minUnits: 21,
    maxUnits: 50,
    priceTaxIncluded: 750,
    priceId: "price_1TAaN0CvZwK1QnPV3G4aIEgk",
    productId: "prod_U8s71hbJa6sBfJ",
    perUnit: "~15 $ / unité",
  },
  {
    units: "51–100 unités",
    minUnits: 51,
    maxUnits: 100,
    priceTaxIncluded: 1000,
    priceId: "price_1TAaN1CvZwK1QnPVXSpL8Yso",
    productId: "prod_U8s7NDnLSnmfmA",
    perUnit: "~10 $ / unité",
  },
  {
    units: "101+ unités",
    minUnits: 101,
    maxUnits: 9999,
    priceTaxIncluded: 1500,
    priceId: "price_1TAaN2CvZwK1QnPVg8FJ8NS3",
    productId: "prod_U8s7XemurTy6Lp",
    perUnit: "Meilleur rapport",
  },
] as const;

export type CondoPricingTier = (typeof CONDO_PRICING_TIERS)[number];

export const CONDO_PRODUCT_IDS = CONDO_PRICING_TIERS.map(t => t.productId);

export function getTierForUnits(unitCount: number): CondoPricingTier {
  return CONDO_PRICING_TIERS.find(t => unitCount >= t.minUnits && unitCount <= t.maxUnits) ?? CONDO_PRICING_TIERS[0];
}
