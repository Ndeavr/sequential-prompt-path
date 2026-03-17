/**
 * UNPRO — SEO Property Type Content Assembly Service
 * Generates unique page content for property-type × city × problem combinations.
 * Designed for 10,000+ unique pages with modular block variation.
 */

import {
  type SeoPropertyType,
  type SeoPropertyTypeProblem,
  type PropertyFamily,
  getPropertyTypeByUrlSlug,
  getPropertyTypesByFamily,
  SEO_PROPERTY_TYPES,
  PROPERTY_FAMILY_LABELS,
} from "../data/propertyTypes";
import { getCityBySlug, getNearbyCityObjects, type SeoCity, SEO_CITIES } from "../data/cities";
import { getFaqsByTopics, type SeoFaq } from "../data/faqs";

// ─── Page Data Types ─────────────────────────────────────────────────

export interface PropertyTypeHubPageData {
  propertyType: SeoPropertyType;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  topProblems: SeoPropertyTypeProblem[];
  familyLabel: string;
  relatedTypes: SeoPropertyType[];
  topCityLinks: { to: string; label: string }[];
  faqs: SeoFaq[];
  jsonLd: Record<string, unknown>;
}

export interface PropertyTypeCityPageData {
  propertyType: SeoPropertyType;
  city: SeoCity;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  localContext: string;
  topProblems: SeoPropertyTypeProblem[];
  contractorBoosts: string[];
  nearbyCityLinks: { to: string; label: string }[];
  problemLinks: { to: string; label: string }[];
  relatedTypeLinks: { to: string; label: string }[];
  faqs: SeoFaq[];
  jsonLd: Record<string, unknown>;
}

export interface PropertyTypeProblemPageData {
  propertyType: SeoPropertyType;
  city: SeoCity;
  problem: SeoPropertyTypeProblem;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  whyItHappens: string;
  signsToWatch: string[];
  risksIfIgnored: string[];
  solutions: string[];
  contractorCategory: string;
  costRange: { low: number; high: number; unit: string };
  bestSeason: string;
  localContext: string;
  nearbyCityLinks: { to: string; label: string }[];
  otherProblemLinks: { to: string; label: string }[];
  parentTypeLink: { to: string; label: string };
  familyHubLink: { to: string; label: string };
  faqs: SeoFaq[];
  jsonLd: Record<string, unknown>;
}

// ─── Content Variation Engine ────────────────────────────────────────

function pickVariation(templates: string[], seed: string): string {
  if (!templates.length) return "";
  const hash = seed.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  return templates[Math.abs(hash) % templates.length];
}

function buildSignsToWatch(problem: SeoPropertyTypeProblem): string[] {
  const base: string[] = [];
  if (problem.urgencyScore >= 8) base.push("Signes visuels visibles (taches, fissures, eau)");
  if (problem.costHigh > 10000) base.push("Dégradation progressive pouvant entraîner des coûts plus élevés si non traité");
  base.push("Augmentation des coûts de chauffage ou d'énergie");
  base.push("Odeurs inhabituelles ou humidité persistante");
  base.push("Bruit d'eau ou condensation anormale");
  return base.slice(0, 4);
}

function buildRisks(problem: SeoPropertyTypeProblem): string[] {
  const risks: string[] = [];
  if (problem.urgencyScore >= 9) risks.push("Risque structurel ou de sécurité pour les occupants");
  if (problem.urgencyScore >= 7) risks.push("Aggravation du problème et augmentation significative des coûts");
  risks.push("Diminution de la valeur de revente de la propriété");
  risks.push("Impact sur le confort et la qualité de vie des occupants");
  if (problem.commercialIntent === "high") risks.push("Possibilité de réclamation d'assurance refusée si négligence démontrée");
  return risks.slice(0, 4);
}

function buildSolutions(problem: SeoPropertyTypeProblem, pt: SeoPropertyType): string[] {
  return [
    `Faire appel à un ${problem.contractorCategory} qualifié pour un diagnostic précis`,
    `Obtenir 2-3 soumissions d'entrepreneurs spécialisés en ${pt.nameFr.toLowerCase()}`,
    `Planifier les travaux idéalement en ${problem.bestSeason.toLowerCase()} pour des conditions optimales`,
    `Comparer les soumissions avec l'aide de l'IA UNPRO pour vérifier les prix et la portée des travaux`,
  ];
}

// ─── Hub Page Builder: /types-de-propriete/:type ─────────────────────

export function buildPropertyTypeHubPage(typeSlug: string): PropertyTypeHubPageData | null {
  const pt = getPropertyTypeByUrlSlug(typeSlug);
  if (!pt) return null;

  const familyLabel = PROPERTY_FAMILY_LABELS[pt.family];
  const relatedTypes = getPropertyTypesByFamily(pt.family).filter((t) => t.slug !== pt.slug);

  const topCityLinks = SEO_CITIES.slice(0, 12).map((c) => ({
    to: `/${c.slug}/${pt.urlSlug}`,
    label: `${pt.nameFr} à ${c.name}`,
  }));

  const faqs = getFaqsByTopics([pt.slug, pt.family, "renovation"], 5);

  return {
    propertyType: pt,
    h1: `${pt.nameFr} au Québec — Problèmes, entretien et entrepreneurs`,
    metaTitle: `${pt.nameFr} | Problèmes fréquents et entrepreneurs vérifiés | UNPRO`,
    metaDescription: `${pt.shortDescriptionFr} Trouvez les problèmes courants, les coûts estimés et des entrepreneurs qualifiés pour votre ${pt.nameFr.toLowerCase()}.`,
    intro: pickVariation(pt.contentVariations.introTemplates, pt.slug),
    topProblems: pt.topProblems,
    familyLabel,
    relatedTypes,
    topCityLinks,
    faqs,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${pt.nameFr} — Problèmes et solutions`,
      description: pt.shortDescriptionFr,
      publisher: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    },
  };
}

// ─── City Page Builder: /:city/:type ─────────────────────────────────

export function buildPropertyTypeCityPage(
  typeSlug: string,
  citySlug: string
): PropertyTypeCityPageData | null {
  const pt = getPropertyTypeByUrlSlug(typeSlug);
  const city = getCityBySlug(citySlug);
  if (!pt || !city) return null;

  const nearbyCities = getNearbyCityObjects(city);
  const nearbyCityLinks = nearbyCities.map((nc) => ({
    to: `/${nc.slug}/${pt.urlSlug}`,
    label: `${pt.nameFr} à ${nc.name}`,
  }));

  const problemLinks = pt.topProblems.map((p) => ({
    to: `/${city.slug}/${pt.urlSlug}/${p.slug}`,
    label: `${p.nameFr} — ${pt.nameFr} à ${city.name}`,
  }));

  const relatedTypeLinks = getPropertyTypesByFamily(pt.family)
    .filter((t) => t.slug !== pt.slug)
    .map((t) => ({
      to: `/${city.slug}/${t.urlSlug}`,
      label: `${t.nameFr} à ${city.name}`,
    }));

  const intro = `${pickVariation(pt.contentVariations.introTemplates, pt.slug + citySlug)} À ${city.name}, les conditions climatiques (${city.climateTags.join(", ")}) accentuent certains de ces défis.`;

  const localContext = `${city.housingHints} Dans la région de ${city.name}, ${pickVariation(pt.contentVariations.whyItHappensTemplates, citySlug + pt.slug)}`;

  const faqs = getFaqsByTopics([pt.slug, citySlug, pt.family], 5);

  return {
    propertyType: pt,
    city,
    h1: `${pt.nameFr} à ${city.name} — Problèmes fréquents et entrepreneurs`,
    metaTitle: `${pt.nameFr} à ${city.name} | Entrepreneurs vérifiés | UNPRO`,
    metaDescription: `Problèmes courants et entrepreneurs qualifiés pour les ${pt.nameFr.toLowerCase()}s à ${city.name}. Soumissions gratuites, vérifications IA, rendez-vous exclusifs.`,
    intro,
    localContext,
    topProblems: pt.topProblems,
    contractorBoosts: pt.contractorBoosts,
    nearbyCityLinks,
    problemLinks,
    relatedTypeLinks,
    faqs,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: `${pt.nameFr} à ${city.name}`,
      description: `Problèmes et entrepreneurs pour ${pt.nameFr.toLowerCase()} à ${city.name}`,
      publisher: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
      about: {
        "@type": "Place",
        name: city.name,
        address: { "@type": "PostalAddress", addressLocality: city.name, addressRegion: city.province },
      },
    },
  };
}

// ─── Problem Page Builder: /:city/:type/:problem ─────────────────────

export function buildPropertyTypeProblemPage(
  typeSlug: string,
  citySlug: string,
  problemSlug: string
): PropertyTypeProblemPageData | null {
  const pt = getPropertyTypeByUrlSlug(typeSlug);
  const city = getCityBySlug(citySlug);
  if (!pt || !city) return null;

  const problem = pt.topProblems.find((p) => p.slug === problemSlug);
  if (!problem) return null;

  const nearbyCities = getNearbyCityObjects(city);
  const nearbyCityLinks = nearbyCities.map((nc) => ({
    to: `/${nc.slug}/${pt.urlSlug}/${problem.slug}`,
    label: `${problem.nameFr} — ${pt.nameFr} à ${nc.name}`,
  }));

  const otherProblemLinks = pt.topProblems
    .filter((p) => p.slug !== problemSlug)
    .map((p) => ({
      to: `/${city.slug}/${pt.urlSlug}/${p.slug}`,
      label: `${p.nameFr} — ${pt.nameFr} à ${city.name}`,
    }));

  const seed = `${typeSlug}-${citySlug}-${problemSlug}`;

  return {
    propertyType: pt,
    city,
    problem,
    h1: `${problem.nameFr} — ${pt.nameFr} à ${city.name}`,
    metaTitle: `${problem.nameFr} ${pt.nameFr} à ${city.name} | Coûts et entrepreneurs | UNPRO`,
    metaDescription: `${problem.nameFr} pour votre ${pt.nameFr.toLowerCase()} à ${city.name}. Coûts estimés : ${problem.costLow}$ à ${problem.costHigh}$. Trouvez un ${problem.contractorCategory} vérifié.`,
    intro: `${pickVariation(pt.contentVariations.introTemplates, seed)} Ce problème de ${problem.nameFr.toLowerCase()} est particulièrement courant pour les ${pt.nameFr.toLowerCase()}s dans la région de ${city.name}.`,
    whyItHappens: pickVariation(pt.contentVariations.whyItHappensTemplates, seed + "why"),
    signsToWatch: buildSignsToWatch(problem),
    risksIfIgnored: buildRisks(problem),
    solutions: buildSolutions(problem, pt),
    contractorCategory: problem.contractorCategory,
    costRange: { low: problem.costLow, high: problem.costHigh, unit: problem.costUnit },
    bestSeason: problem.bestSeason,
    localContext: `À ${city.name}, les conditions climatiques (${city.climateTags.join(", ")}) influencent directement ce type de problème. ${city.housingHints}`,
    nearbyCityLinks,
    otherProblemLinks,
    parentTypeLink: { to: `/${city.slug}/${pt.urlSlug}`, label: `${pt.nameFr} à ${city.name}` },
    familyHubLink: { to: `/types-de-propriete/${pt.urlSlug}`, label: `${pt.nameFr} au Québec` },
    faqs: getFaqsByTopics([problemSlug, pt.slug, problem.contractorCategory], 5),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `Résoudre ${problem.nameFr.toLowerCase()} — ${pt.nameFr} à ${city.name}`,
      description: `Guide complet pour résoudre un problème de ${problem.nameFr.toLowerCase()} sur un ${pt.nameFr.toLowerCase()} à ${city.name}.`,
      estimatedCost: {
        "@type": "MonetaryAmount",
        currency: "CAD",
        minValue: problem.costLow,
        maxValue: problem.costHigh,
      },
      step: buildSolutions(problem, pt).map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        text: s,
      })),
    },
  };
}
