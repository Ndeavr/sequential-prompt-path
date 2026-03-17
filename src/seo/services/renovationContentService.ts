/**
 * UNPRO — Renovation SEO Content Assembly Service
 * Composes unique renovation transformation pages from structured data.
 * 20+ project types × 50+ cities = 1,000+ pages at launch, scaling to 10,000+.
 */

import type { SeoCity } from "../data/cities";
import type { SeoFaq } from "../data/faqs";
import {
  SEO_RENOVATIONS,
  getRenovationBySlug,
  getRelatedRenovationObjects,
  RENOVATION_CATEGORIES,
  type SeoRenovation,
} from "../data/renovations";
import { SEO_CITIES, getCityBySlug, getNearbyCityObjects } from "../data/cities";

export interface RenovationPageData {
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  designTips: string[];
  budgetTiers: {
    cosmetic: { low: number; high: number };
    balanced: { low: number; high: number };
    premium: { low: number; high: number };
  };
  localContext: string;
  faqs: SeoFaq[];
  contractorTypes: string[];
  relatedRenovationPages: { slug: string; citySlug: string; label: string }[];
  nearbyCityPages: { slug: string; renovationSlug: string; label: string }[];
  categoryLabel: string;
  searchUrl: string;
  jsonLd: Record<string, unknown>;
}

export function buildRenovationPage(
  renovationSlug: string,
  citySlug: string
): RenovationPageData | null {
  const renovation = getRenovationBySlug(renovationSlug);
  const city = getCityBySlug(citySlug);
  if (!renovation || !city) return null;

  const h1 = `${renovation.nameFr} à ${city.name}`;
  const metaTitle = `${renovation.nameFr} ${city.name} — Rendez-vous garanti | Entrepreneur vérifié | UNPRO`;
  const metaDescription = `Trouvez un entrepreneur fiable pour ${renovation.nameFr.toLowerCase()} à ${city.name}. Aucun spam, aucun comparatif inutile. Rendez-vous confirmé avec un professionnel qualifié.`;

  const categoryInfo = RENOVATION_CATEGORIES.find((c) => c.slug === renovation.category);
  const categoryLabel = categoryInfo?.labelFr ?? renovation.category;

  const intro = `Vous planifiez une ${renovation.nameFr.toLowerCase()} à ${city.name} ? ${renovation.shortDescription} Dans la région de ${city.region}, les conditions locales (${city.climateTags.join(", ")}) influencent le choix des matériaux et la planification des travaux.`;

  const localContext = `${city.housingHints} À ${city.name}, les ${city.climateTags.join(" et ")} sont des facteurs importants à considérer pour votre projet de ${renovation.nameFr.toLowerCase()}. Un entrepreneur local connaîtra les particularités de la région.`;

  const faqs: SeoFaq[] = renovation.faqs.map((f) => ({
    question: f.question,
    answer: f.answer,
    topics: [renovation.category],
  }));

  const relatedRenovationPages = getRelatedRenovationObjects(renovation).map((r) => ({
    slug: r.slug,
    citySlug: city.slug,
    label: `${r.nameFr} à ${city.name}`,
  }));

  const nearbyCityPages = getNearbyCityObjects(city).map((nc) => ({
    slug: nc.slug,
    renovationSlug: renovation.slug,
    label: `${renovation.nameFr} à ${nc.name}`,
  }));

  const searchUrl = `/search?specialty=${encodeURIComponent(renovation.contractorTypes[0] ?? "renovation")}&city=${encodeURIComponent(city.name)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: h1,
    description: renovation.shortDescription,
    provider: {
      "@type": "Organization",
      name: "UNPRO",
      url: "https://unpro.ca",
    },
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: city.region,
      },
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice: renovation.budgetTiers.cosmetic.low,
      highPrice: renovation.budgetTiers.premium.high,
      priceCurrency: "CAD",
    },
  };

  return {
    h1,
    metaTitle,
    metaDescription,
    intro,
    designTips: renovation.designTips,
    budgetTiers: renovation.budgetTiers,
    localContext,
    faqs,
    contractorTypes: renovation.contractorTypes,
    relatedRenovationPages,
    nearbyCityPages,
    categoryLabel,
    searchUrl,
    jsonLd,
  };
}

// ─── Sitemap helpers ───

export function getAllRenovationLocationSlugs(): { renovation: string; city: string }[] {
  return SEO_RENOVATIONS.flatMap((r) =>
    SEO_CITIES.map((c) => ({ renovation: r.slug, city: c.slug }))
  );
}

export function getRenovationPageCount(): number {
  return SEO_RENOVATIONS.length * SEO_CITIES.length;
}
