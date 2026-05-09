/**
 * UNPRO — SchemaStack
 * Stacks the 4 blueprint JSON-LD schemas: BreadcrumbList + (LocalBusiness | FAQPage | HowTo).
 * Renders inline <script type="application/ld+json"> tags (no useEffect cleanup needed).
 */
import { Fragment } from "react";

type Crumb = { name: string; url: string };
type FaqItem = { question: string; answer: string };
type HowToStep = { name: string; text: string };
type LocalBusinessInput = {
  name: string;
  url: string;
  city: string;
  region?: string;
  geo?: { lat: number; lng: number };
  areaServed?: string[];
  serviceType?: string[];
  rating?: { value: number; count: number };
};

interface SchemaStackProps {
  breadcrumbs?: Crumb[];
  localBusiness?: LocalBusinessInput;
  faqs?: FaqItem[];
  howTo?: {
    name: string;
    estimatedCostCAD?: { low: number; high: number };
    totalTimeISO?: string;
    supplies?: string[];
    steps: HowToStep[];
  };
}

function script(obj: object) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
    />
  );
}

export default function SchemaStack({ breadcrumbs, localBusiness, faqs, howTo }: SchemaStackProps) {
  return (
    <Fragment>
      {breadcrumbs && breadcrumbs.length > 0 && script({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((c, i) => ({
          "@type": "ListItem", position: i + 1, name: c.name, item: c.url,
        })),
      })}

      {localBusiness && script({
        "@context": "https://schema.org",
        "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
        name: localBusiness.name,
        url: localBusiness.url,
        address: {
          "@type": "PostalAddress",
          addressLocality: localBusiness.city,
          addressRegion: localBusiness.region || "QC",
          addressCountry: "CA",
        },
        ...(localBusiness.geo ? {
          geo: { "@type": "GeoCoordinates", latitude: localBusiness.geo.lat, longitude: localBusiness.geo.lng },
        } : {}),
        ...(localBusiness.areaServed ? { areaServed: localBusiness.areaServed } : {}),
        ...(localBusiness.serviceType ? { serviceType: localBusiness.serviceType } : {}),
        ...(localBusiness.rating ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: localBusiness.rating.value,
            reviewCount: localBusiness.rating.count,
          },
        } : {}),
      })}

      {faqs && faqs.length > 0 && script({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      })}

      {howTo && script({
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: howTo.name,
        ...(howTo.estimatedCostCAD ? {
          estimatedCost: {
            "@type": "MonetaryAmount",
            currency: "CAD",
            value: `${howTo.estimatedCostCAD.low}-${howTo.estimatedCostCAD.high}`,
          },
        } : {}),
        ...(howTo.totalTimeISO ? { totalTime: howTo.totalTimeISO } : {}),
        ...(howTo.supplies ? { supply: howTo.supplies } : {}),
        step: howTo.steps.map((s) => ({ "@type": "HowToStep", name: s.name, text: s.text })),
      })}
    </Fragment>
  );
}
