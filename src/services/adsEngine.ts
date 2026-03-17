/**
 * UNPRO — AI Ads Engine
 * Generates and optimizes Google/Meta campaigns from real demand data.
 */

export interface AdCampaign {
  id: string;
  platform: "google" | "meta";
  campaign_name: string;
  trade_slug: string | null;
  city_slug: string | null;
  status: string;
  budget_daily_cents: number;
  budget_total_cents: number;
  spend_cents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc_cents: number;
  cost_per_appointment_cents: number;
  keywords: string[];
  ad_copy: AdCopy;
  targeting: Record<string, unknown>;
  landing_page_url: string | null;
  optimization_notes: string | null;
  created_at: string;
}

export interface AdCopy {
  headlines?: string[];
  descriptions?: string[];
  hooks?: string[];
  cta?: string;
  visual_prompt?: string;
}

export interface AdGroup {
  id: string;
  campaign_id: string;
  group_name: string;
  service_slug: string | null;
  keywords: string[];
  negative_keywords: string[];
  ad_variants: AdCopy[];
  status: string;
  impressions: number;
  clicks: number;
  conversions: number;
}

// --- Campaign generation from demand data ---

export function generateGoogleCampaign(params: {
  trade: string;
  city: string;
  services: string[];
  keywords: string[];
  demandScore: number;
}): Partial<AdCampaign> {
  const { trade, city, services, keywords, demandScore } = params;

  const baseBudget = Math.round(demandScore * 15); // higher demand = higher budget
  const headlines = [
    `${capitalize(trade)} à ${capitalize(city)} — Rendez-vous garanti`,
    `Trouvez votre ${trade} vérifié à ${capitalize(city)}`,
    `${capitalize(trade)} certifié — Résultats en 48h`,
  ];

  const descriptions = [
    `Arrêtez de demander 3 soumissions — trouvez le bon entrepreneur dès maintenant.`,
    `Rendez-vous exclusif, entrepreneur vérifié, satisfaction garantie.`,
    `UNPRO analyse votre projet et vous connecte au meilleur professionnel.`,
  ];

  return {
    platform: "google",
    campaign_name: `Google — ${capitalize(trade)} ${capitalize(city)}`,
    trade_slug: trade,
    city_slug: city,
    status: "draft",
    budget_daily_cents: baseBudget * 100,
    keywords,
    ad_copy: { headlines, descriptions, cta: "Obtenir mon rendez-vous" },
    landing_page_url: `/services/${trade}/${city}`,
  };
}

export function generateMetaCampaign(params: {
  trade: string;
  city: string;
  painPoints: string[];
  demandScore: number;
}): Partial<AdCampaign> {
  const { trade, city, painPoints, demandScore } = params;

  const hooks = painPoints.map(
    (p) => `${p} ? Trouvez un ${trade} vérifié à ${capitalize(city)}.`
  );

  hooks.push(
    `Marre de chercher un bon ${trade} ? UNPRO fait le travail pour vous.`,
    `Rendez-vous garanti, non partagé. Un seul entrepreneur, le bon.`
  );

  return {
    platform: "meta",
    campaign_name: `Meta — ${capitalize(trade)} ${capitalize(city)}`,
    trade_slug: trade,
    city_slug: city,
    status: "draft",
    budget_daily_cents: Math.round(demandScore * 10) * 100,
    ad_copy: {
      hooks,
      headlines: [`${capitalize(trade)} vérifié à ${capitalize(city)}`],
      descriptions: [`Rendez-vous exclusif en 48h. Satisfaction garantie.`],
      cta: "Réserver maintenant",
      visual_prompt: `Professional ${trade} working in a ${city} home, high quality, warm lighting`,
    },
  };
}

export function generateKeywordsFromFingerprints(fingerprints: Array<{
  problem_slug?: string;
  material?: string;
  structure_type?: string;
  city_slug?: string;
}>): string[] {
  const keywords = new Set<string>();

  for (const fp of fingerprints) {
    const parts = [fp.problem_slug, fp.material, fp.structure_type, fp.city_slug].filter(Boolean);
    if (parts.length >= 2) {
      keywords.add(parts.join(" "));
      // Long-tail variants
      if (fp.problem_slug && fp.city_slug) {
        keywords.add(`${fp.problem_slug} ${fp.city_slug}`);
      }
      if (fp.problem_slug && fp.material) {
        keywords.add(`${fp.problem_slug} ${fp.material}`);
      }
    }
  }

  return Array.from(keywords);
}

export function calculateROI(campaign: Pick<AdCampaign, "spend_cents" | "conversions" | "cost_per_appointment_cents">): {
  roi: number;
  efficiency: "excellent" | "good" | "average" | "poor";
} {
  if (campaign.spend_cents === 0) return { roi: 0, efficiency: "average" };

  const costPerConversion = campaign.conversions > 0
    ? campaign.spend_cents / campaign.conversions
    : Infinity;

  const roi = campaign.conversions > 0
    ? ((campaign.conversions * 5000 - campaign.spend_cents) / campaign.spend_cents) * 100
    : -100;

  const efficiency = costPerConversion < 2000 ? "excellent"
    : costPerConversion < 5000 ? "good"
    : costPerConversion < 10000 ? "average"
    : "poor";

  return { roi: Math.round(roi), efficiency };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}
