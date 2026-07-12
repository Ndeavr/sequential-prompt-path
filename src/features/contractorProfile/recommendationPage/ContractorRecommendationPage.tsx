/**
 * UNPRO — Contractor Recommendation Page
 * Not a directory listing. A live AI recommendation reference page.
 * Route: /entrepreneur/:slug  AND  /contractor/:slug/:city
 */
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import ContractorSchemaStack from "@/seo/components/ContractorSchemaStack";
import NotFound from "@/pages/NotFound";
import { canonicals } from "@/seo/services/canonicalManager";
import { useContractorRecommendation } from "./hooks/useContractorRecommendation";
import HeroRecommendation from "./sections/HeroRecommendation";
import AlexRecommendationCard from "./sections/AlexRecommendationCard";
import MediaGallery from "./sections/MediaGallery";
import ServiceAreaMap from "./sections/ServiceAreaMap";
import StructuredServices from "./sections/StructuredServices";
import VerificationsByProfession from "./sections/VerificationsByProfession";
import CompatibilityCard from "./sections/CompatibilityCard";
import AvailabilityCard from "./sections/AvailabilityCard";
import SmartFAQ, { buildFaqSchema } from "./sections/SmartFAQ";
import ProjectsShowcase from "./sections/ProjectsShowcase";
import AboutContractor from "./sections/AboutContractor";
import FinalCTA from "./sections/FinalCTA";
import AIReferenceBlock from "./sections/AIReferenceBlock";

export default function ContractorRecommendationPage() {
  const { slug, city } = useParams<{ slug: string; city?: string }>();
  const { data, isLoading } = useContractorRecommendation(slug);

  const canonical = useMemo(() => {
    if (!slug) return "";
    return city
      ? canonicals.contractor(slug, city)
      : `https://unpro.ca/entrepreneur/${slug}`;
  }, [slug, city]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <div className="h-24 rounded-2xl bg-muted animate-pulse" />
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
          <div className="h-56 rounded-2xl bg-muted animate-pulse" />
        </div>
      </MainLayout>
    );
  }

  if (!data) return <NotFound />;

  const { contractor: c, projects, aiReference, compatibility } = data;
  const cityName = city || c.city || c.service_areas?.[0] || "Québec";

  const title = `${c.business_name}${c.specialty ? ` — ${c.specialty}` : ""} à ${cityName} | Recommandation UNPRO`;
  const description = (
    c.description ||
    `Pourquoi Alex recommande ${c.business_name} à ${cityName}. Vérifications UNPRO, zone desservie, compatibilité, disponibilité.`
  ).slice(0, 155);

  const breadcrumbs = [
    { name: "Accueil", url: "https://unpro.ca" },
    { name: "Entrepreneurs", url: "https://unpro.ca/entrepreneur" },
    { name: cityName, url: `https://unpro.ca/entrepreneurs/${cityName.toLowerCase()}` },
    { name: c.business_name, url: canonical },
  ];

  const gallery = (c.portfolio_urls ?? [])
    .filter(Boolean)
    .map((url: string) => ({ url, type: "photo" as const }));

  const faqs = buildFaqSchema(c);

  const schemaInput = {
    page_type: "contractor_recommendation" as const,
    language: "fr" as const,
    contractor_id: c.id,
    slug: c.slug ?? slug!,
    canonical_url: canonical,
    business_name: c.business_name,
    legal_name: c.legal_name || c.business_name,
    logo: {
      url: c.logo_url ?? null,
      verified: !!c.admin_verified,
      monogram: { initials: (c.business_name || "?").slice(0, 2).toUpperCase(), bg: "#0F1A2E", fg: "#F5C542" },
    },
    hero: {
      tagline: c.description || `${c.business_name} — recommandé par UNPRO`,
      territories: c.service_areas ?? [cityName],
      phone: c.phone || "N/A",
      website: c.website || undefined,
    },
    description: c.description || `${c.business_name} dessert ${cityName}.`,
    gallery: gallery.map((g) => ({
      url: g.url,
      category: "completed_project" as const,
      alt: c.business_name,
      verified: false,
      tags: [],
    })),
    faqs: faqs.map((f) => ({ question: f.q, answer: f.a })),
    ctas: {
      book_appointment: "Parler à Alex",
      alex: "Parler à Alex",
      evaluation: "Voir mon niveau de compatibilité",
    },
    service_area: c.service_areas ?? [cityName],
    service_types: c.services_structured?.length ? c.services_structured : [c.specialty || "Services résidentiels"],
    rating: c.rating ? { value: c.rating, count: c.review_count ?? 0 } : undefined,
  };

  return (
    <MainLayout>
      <SeoHead title={title} description={description} canonical={canonical} />
      <ContractorSchemaStack input={schemaInput as any} breadcrumbs={breadcrumbs} />

      {/* GeoCircle for service radius */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "GeoCircle",
            geoRadius: `${(c.travel_radius_km ?? 15) * 1000}`,
            geoMidpoint: {
              "@type": "GeoCoordinates",
              addressLocality: cityName,
              addressRegion: "QC",
              addressCountry: "CA",
            },
          }),
        }}
      />

      <AIReferenceBlock reference={aiReference} />

      <article className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-8">
        <HeroRecommendation contractor={c} />
        <AlexRecommendationCard
          reference={aiReference}
          categoryLabel={c.specialty}
          areas={c.service_areas ?? [cityName]}
        />
        <MediaGallery items={gallery} businessName={c.business_name} />
        <ServiceAreaMap
          areas={c.service_areas ?? []}
          radiusKm={c.travel_radius_km ?? 15}
          primaryCity={c.city}
        />
        <StructuredServices services={c.services_structured ?? []} />
        <VerificationsByProfession categorySlug={c.specialty} contractor={c} />
        <CompatibilityCard fits={compatibility.fits} not_fits={compatibility.not_fits} />
        <AvailabilityCard key_={c.availability_estimate ?? "cette_semaine"} />
        <SmartFAQ contractor={c} />
        <ProjectsShowcase projects={projects} businessName={c.business_name} />
        <AboutContractor contractor={c} />
        <FinalCTA contractorId={c.id} businessName={c.business_name} />
      </article>
    </MainLayout>
  );
}
