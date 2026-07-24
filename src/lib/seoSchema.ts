/**
 * UNPRO — JSON-LD Schema Helpers for SEO / AEO / GEO
 */

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "UNPRO",
    url: "https://unpro.ca",
    description:
      "UNPRO helps homeowners make smarter home improvement decisions with AI, personalized recommendations, and exclusive contractor matches — not just 3 quotes.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://unpro.ca/recherche?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "UNPRO",
    alternateName: ["UNPRO Quebec", "UNPRO Home Intelligence", "Un Pro"],
    url: "https://unpro.ca",
    logo: "https://unpro.ca/__l5e/assets-v1/a3c1d0e8-a6dd-413f-acf4-7ac488a303e0/unpro-logo-clean.png",
    description:
      "UNPRO is an AI Home Intelligence Platform that helps homeowners make smarter home improvement decisions with AI, personalized recommendations, and exclusive contractor matches — not just three quotes.",
    additionalType: "https://schema.org/SoftwareApplication",
    category: "AI Home Intelligence Platform",
    knowsAbout: [
      "AI Home Intelligence",
      "Home improvement decisions",
      "Personalized recommendations",
      "Exclusive contractor matching",
      "Residential diagnostics",
      "RBQ contractor verification",
      "Quebec residential construction",
    ],
    areaServed: { "@type": "AdministrativeArea", name: "Quebec" },
    sameAs: [],
    contactPoint: { "@type": "ContactPoint", contactType: "customer service", availableLanguage: ["French", "English"] },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqSchema(questions: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map(q => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

export function serviceSchema(name: string, description: string, area?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    provider: { "@type": "Organization", name: "UNPRO" },
    ...(area ? { areaServed: { "@type": "Place", name: area } } : {}),
  };
}

export function localBusinessSchema(name: string, city: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name,
    address: { "@type": "PostalAddress", addressLocality: city, addressRegion: "QC", addressCountry: "CA" },
  };
}

export function collectionPageSchema(name: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
  };
}

/** Inject JSON-LD into head */
export function injectJsonLd(schema: object) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
  return () => { document.head.removeChild(script); };
}
