/**
 * UNPRO Condo — Landing Page Teaser AEO
 * Premium teaser page for QC condo management. SEO + AEO optimized.
 */
import { useEffect, useRef } from "react";
import SeoHead from "@/seo/components/SeoHead";
import HeroSectionCondoTeaser from "@/components/condo-landing/HeroSectionCondoTeaser";
import BannerLoi16Urgency from "@/components/condo-landing/BannerLoi16Urgency";
import SectionCondoPainGrid from "@/components/condo-landing/SectionCondoPainGrid";
import SectionCondoHowItWorks from "@/components/condo-landing/SectionCondoHowItWorks";
import SectionCondoComparison from "@/components/condo-landing/SectionCondoComparison";
import SectionCondoUseCases from "@/components/condo-landing/SectionCondoUseCases";
import SectionCondoFeaturePreview from "@/components/condo-landing/SectionCondoFeaturePreview";
import SectionCondoBoardTurnover from "@/components/condo-landing/SectionCondoBoardTurnover";
import SectionCondoRecordsChaos from "@/components/condo-landing/SectionCondoRecordsChaos";
import SectionCondoCompliancePreview from "@/components/condo-landing/SectionCondoCompliancePreview";
import SectionCondoTrustSignals from "@/components/condo-landing/SectionCondoTrustSignals";
import SectionCondoFAQAEO from "@/components/condo-landing/SectionCondoFAQAEO";
import SectionCondoCTAWaitlist from "@/components/condo-landing/SectionCondoCTAWaitlist";
import SectionCondoLeadMagnet from "@/components/condo-landing/SectionCondoLeadMagnet";
import SectionCondoSEOBody from "@/components/condo-landing/SectionCondoSEOBody";
import SectionCondoInternalLinks from "@/components/condo-landing/SectionCondoInternalLinks";

export default function PageLandingCondoTeaser() {
  const waitlistRef = useRef<HTMLDivElement>(null);

  const scrollToWaitlist = () => {
    waitlistRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // JSON-LD: SoftwareApplication + Organization
  useEffect(() => {
    const schemas = [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "UNPRO Condo",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "CAD", availability: "https://schema.org/PreOrder" },
        description: "Plateforme de gestion de copropriété au Québec. Conformité Loi 16, documents, fonds de prévoyance, assemblées et relève du CA.",
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: "Comment gérer une copropriété avec UNPRO Condo",
        step: [
          { "@type": "HowToStep", name: "Centraliser", text: "Regroupez documents et données de l'immeuble." },
          { "@type": "HowToStep", name: "Suivre", text: "Obligations, fonds, tâches et échéances structurés." },
          { "@type": "HowToStep", name: "Retrouver", text: "Recherche instantanée assistée par IA." },
          { "@type": "HowToStep", name: "Transmettre", text: "Transition fluide entre administrateurs." },
        ],
      },
    ];

    const scripts = schemas.map((s, i) => {
      const el = document.createElement("script");
      el.type = "application/ld+json";
      el.text = JSON.stringify(s);
      el.id = `condo-schema-${i}`;
      document.getElementById(el.id)?.remove();
      document.head.appendChild(el);
      return el;
    });

    return () => scripts.forEach((s) => s.remove());
  }, []);

  return (
    <>
      <SeoHead
        title="Gestion de copropriété au Québec — UNPRO Condo | Loi 16, documents, fonds"
        description="UNPRO Condo simplifie la gestion de copropriété au Québec : conformité Loi 16, documents centralisés, fonds de prévoyance, relève du CA. Pour syndicats et autogestion."
        canonical="https://unpro.ca/gestion-copropriete-quebec"
      />

      <main className="min-h-screen">
        <BannerLoi16Urgency />
        <HeroSectionCondoTeaser onCTAClick={scrollToWaitlist} />
        <SectionCondoPainGrid />
        <SectionCondoHowItWorks />
        <SectionCondoComparison />
        <SectionCondoUseCases />
        <SectionCondoFeaturePreview />
        <SectionCondoBoardTurnover />
        <SectionCondoRecordsChaos />
        <SectionCondoCompliancePreview />
        <SectionCondoTrustSignals />
        <SectionCondoLeadMagnet />
        <SectionCondoFAQAEO />
        <div ref={waitlistRef}>
          <SectionCondoCTAWaitlist />
        </div>
        <SectionCondoSEOBody />
        <SectionCondoInternalLinks />
      </main>
    </>
  );
}
