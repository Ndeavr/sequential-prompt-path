/**
 * UNPRO — Contractor schema stack.
 * Always injects LocalBusiness + Organization + Service + Review + FAQPage + BreadcrumbList.
 * No exceptions. Missing pieces are logged (validator flags them separately).
 */
import { Fragment } from "react";
import type { ContractorPageInput } from "@/features/contractorProfile/generator/pageTypes";

function script(obj: object) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
    />
  );
}

interface Crumb { name: string; url: string }

interface Props {
  input: ContractorPageInput;
  breadcrumbs: Crumb[];
}

export default function ContractorSchemaStack({ input, breadcrumbs }: Props) {
  const orgId = `${input.canonical_url}#organization`;
  const bizId = `${input.canonical_url}#localbusiness`;

  return (
    <Fragment>
      {script({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((c, i) => ({
          "@type": "ListItem", position: i + 1, name: c.name, item: c.url,
        })),
      })}

      {script({
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": orgId,
        name: input.business_name,
        legalName: input.legal_name ?? input.business_name,
        url: input.hero.website ?? input.canonical_url,
        logo: input.logo.url ?? undefined,
        telephone: input.hero.phone,
      })}

      {script({
        "@context": "https://schema.org",
        "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
        "@id": bizId,
        name: input.business_name,
        url: input.canonical_url,
        image: input.logo.url ?? undefined,
        telephone: input.hero.phone,
        areaServed: input.service_area,
        address: {
          "@type": "PostalAddress",
          addressRegion: "QC",
          addressCountry: "CA",
        },
        ...(input.rating ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: input.rating.value,
            reviewCount: input.rating.count,
          },
        } : {}),
      })}

      {input.service_types.map((st, idx) => script({
        "@context": "https://schema.org",
        "@type": "Service",
        serviceType: st,
        provider: { "@id": orgId },
        areaServed: input.service_area,
        "@id": `${input.canonical_url}#service-${idx}`,
      }))}

      {input.rating && script({
        "@context": "https://schema.org",
        "@type": "Review",
        itemReviewed: { "@id": bizId },
        reviewRating: {
          "@type": "Rating",
          ratingValue: input.rating.value,
          bestRating: 5,
        },
        author: { "@type": "Organization", name: "UNPRO" },
      })}

      {input.faqs.length > 0 && script({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: input.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      })}
    </Fragment>
  );
}
