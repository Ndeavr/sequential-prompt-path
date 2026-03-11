/**
 * UNPRO — SEO Content Assembly Service
 * Composes unique page content from structured fragments.
 * Designed for 30,000+ pages via combinatorial assembly.
 */

import type { SeoCity } from "../data/cities";
import type { SeoService } from "../data/services";
import type { SeoProblem } from "../data/problems";
import { getFaqsByTopics, type SeoFaq } from "../data/faqs";
import { SEO_SERVICES, getServiceBySlug } from "../data/services";
import { SEO_PROBLEMS, getProblemBySlug } from "../data/problems";
import { SEO_CITIES, getCityBySlug, getNearbyCityObjects } from "../data/cities";
import { SEO_GUIDES } from "../data/guides";

// ─── Service + Location Page ────────────────────────────────────────

export interface ServiceLocationPageData {
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  whyItMatters: string;
  pricingFactors: string[];
  whenToAct: string[];
  costEstimate: { low: number; high: number; unit: string };
  localContext: string;
  contractorType: string;
  faqs: SeoFaq[];
  relatedServicePages: { slug: string; citySlug: string; label: string }[];
  relatedProblemPages: { slug: string; citySlug: string; label: string }[];
  nearbyCityPages: { slug: string; serviceSlug: string; label: string }[];
  searchUrl: string;
  jsonLd: Record<string, unknown>;
}

export function buildServiceLocationPage(
  serviceSlug: string,
  citySlug: string
): ServiceLocationPageData | null {
  const service = getServiceBySlug(serviceSlug);
  const city = getCityBySlug(citySlug);
  if (!service || !city) return null;

  const h1 = `${service.name} à ${city.name}`;
  const metaTitle = `${service.name} à ${city.name} | Entrepreneurs vérifiés | UNPRO`;
  const metaDescription = `Trouvez un entrepreneur en ${service.name.toLowerCase()} à ${city.name}. Comparez les soumissions, vérifiez les licences et obtenez le meilleur prix. ${city.region}, ${city.province}.`;

  const intro = `Vous cherchez un professionnel en ${service.name.toLowerCase()} à ${city.name} ? ${service.shortDescription} Dans la région de ${city.region}, les conditions climatiques particulières (${city.climateTags.join(", ")}) rendent ce service d'autant plus important.`;

  const localContext = `${city.housingHints} Dans la région de ${city.name}, les ${city.climateTags.join(" et ")} influencent directement les besoins en ${service.name.toLowerCase()}. Il est essentiel de choisir un entrepreneur qui connaît bien les particularités de la région.`;

  const faqs = getFaqsByTopics([service.contractorType, service.slug, "general"], 5);

  const relatedServicePages = service.relatedServices
    .map((s) => getServiceBySlug(s))
    .filter((s): s is SeoService => !!s)
    .map((s) => ({ slug: s.slug, citySlug: city.slug, label: `${s.name} à ${city.name}` }));

  const relatedProblemPages = service.relatedProblems
    .map((p) => getProblemBySlug(p))
    .filter((p): p is SeoProblem => !!p)
    .map((p) => ({ slug: p.slug, citySlug: city.slug, label: `${p.name} à ${city.name}` }));

  const nearbyCityPages = getNearbyCityObjects(city).map((nc) => ({
    slug: nc.slug,
    serviceSlug: service.slug,
    label: `${service.name} à ${nc.name}`,
  }));

  const searchUrl = `/search?specialty=${encodeURIComponent(service.contractorType)}&city=${encodeURIComponent(city.name)}`;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: h1,
    description: service.shortDescription,
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
      lowPrice: service.costEstimate.low,
      highPrice: service.costEstimate.high,
      priceCurrency: "CAD",
      offerCount: "3+",
    },
  };

  return {
    h1, metaTitle, metaDescription, intro, whyItMatters: service.whyItMatters,
    pricingFactors: service.pricingFactors, whenToAct: service.whenToAct,
    costEstimate: service.costEstimate,
    localContext, contractorType: service.contractorType, faqs,
    relatedServicePages, relatedProblemPages, nearbyCityPages, searchUrl, jsonLd,
  };
}

// ─── Problem + Location Page ────────────────────────────────────────

export interface ProblemLocationPageData {
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  symptoms: string[];
  commonCauses: string[];
  risks: string[];
  whatToCheck: string[];
  urgency: string;
  costEstimate: { low: number; high: number; unit: string };
  localContext: string;
  contractorTypes: string[];
  faqs: SeoFaq[];
  relatedProblemPages: { slug: string; citySlug: string; label: string }[];
  relatedServicePages: { slug: string; citySlug: string; label: string }[];
  nearbyCityPages: { slug: string; problemSlug: string; label: string }[];
  searchUrl: string;
  jsonLd: Record<string, unknown>;
}

export function buildProblemLocationPage(
  problemSlug: string,
  citySlug: string
): ProblemLocationPageData | null {
  const problem = getProblemBySlug(problemSlug);
  const city = getCityBySlug(citySlug);
  if (!problem || !city) return null;

  const h1 = `${problem.name} à ${city.name}`;
  const metaTitle = `${problem.name} à ${city.name} | Solutions et entrepreneurs | UNPRO`;
  const metaDescription = `${problem.name} à ${city.name} : symptômes, causes, coûts estimés et solutions. Trouvez un entrepreneur vérifié pour résoudre ce problème. ${city.region}.`;

  const intro = `${problem.shortDescription} À ${city.name}, les conditions locales (${city.climateTags.join(", ")}) peuvent aggraver ce problème. Voici comment identifier, comprendre et résoudre ce problème.`;

  const localContext = `${city.housingHints} Le climat de ${city.name} (${city.climateTags.join(", ")}) peut contribuer directement à ce type de problème. Une intervention adaptée aux conditions locales est essentielle.`;

  const urgencyLabel = { low: "Faible", medium: "Moyenne", high: "Élevée", critical: "Critique" }[problem.urgency];

  const faqs = getFaqsByTopics(problem.contractorTypes.concat([problem.slug]), 5);

  const relatedProblemPages = problem.relatedProblems
    .map((p) => getProblemBySlug(p))
    .filter((p): p is SeoProblem => !!p)
    .map((p) => ({ slug: p.slug, citySlug: city.slug, label: `${p.name} à ${city.name}` }));

  const relatedServicePages = problem.relatedServices
    .map((s) => getServiceBySlug(s))
    .filter((s): s is SeoService => !!s)
    .map((s) => ({ slug: s.slug, citySlug: city.slug, label: `${s.name} à ${city.name}` }));

  const nearbyCityPages = getNearbyCityObjects(city).map((nc) => ({
    slug: nc.slug,
    problemSlug: problem.slug,
    label: `${problem.name} à ${nc.name}`,
  }));

  const searchUrl = `/search?specialty=${encodeURIComponent(problem.contractorTypes[0] ?? "")}&city=${encodeURIComponent(city.name)}`;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `Comment résoudre : ${h1}`,
    description: problem.shortDescription,
    step: problem.whatToCheck.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text: step,
    })),
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "CAD",
      minValue: problem.costEstimate.low,
      maxValue: problem.costEstimate.high,
    },
  };

  return {
    h1, metaTitle, metaDescription, intro,
    symptoms: problem.symptoms, commonCauses: problem.commonCauses,
    risks: problem.risks, whatToCheck: problem.whatToCheck,
    urgency: urgencyLabel, costEstimate: problem.costEstimate,
    localContext, contractorTypes: problem.contractorTypes,
    faqs, relatedProblemPages, relatedServicePages, nearbyCityPages, searchUrl, jsonLd,
  };
}

// ─── Sitemap helpers ────────────────────────────────────────────────

export function getAllServiceLocationSlugs(): { service: string; city: string }[] {
  return SEO_SERVICES.flatMap((s) => SEO_CITIES.map((c) => ({ service: s.slug, city: c.slug })));
}

export function getAllProblemLocationSlugs(): { problem: string; city: string }[] {
  return SEO_PROBLEMS.flatMap((p) => SEO_CITIES.map((c) => ({ problem: p.slug, city: c.slug })));
}

export function getAllGuideSlugs(): string[] {
  return SEO_GUIDES.map((g) => g.slug);
}

/** Total programmatic page count */
export function getTotalSeoPageCount(): number {
  return (SEO_SERVICES.length * SEO_CITIES.length) + (SEO_PROBLEMS.length * SEO_CITIES.length) + SEO_GUIDES.length;
}
