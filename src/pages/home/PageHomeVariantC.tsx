/**
 * PageHomeVariantC — "Le bon entrepreneur." Ultra-minimal Apple/OpenAI cadence.
 * Sells the idea first, explains second. Mobile-first dark premium.
 */
import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

import HeroLeBon from "@/components/home-variant-c/HeroLeBon";
import SectionWhyThisContractor from "@/components/home-variant-c/SectionWhyThisContractor";
import SectionWhyCompare3Quotes from "@/components/home-variant-c/SectionWhyCompare3Quotes";
import SectionContractorPitch from "@/components/home-variant-c/SectionContractorPitch";
import SectionWhatHomeownerSees from "@/components/home-variant-c/SectionWhatHomeownerSees";
import SectionDualCtaFinal from "@/components/home-variant-c/SectionDualCtaFinal";

export default function PageHomeVariantC() {
  const trackCta = useCallback((ctaKey: string, section: string) => {
    supabase
      .from("entrepreneur_cta_events")
      .insert({
        visitor_id: crypto.randomUUID(),
        cta_key: `home_c_${ctaKey}`,
        page_section: section,
      })
      .then(() => {})
      .then(undefined, () => {});
  }, []);

  return (
    <>
      <Helmet>
        <title>UNPRO | Votre plateforme d'intelligence résidentielle propulsée par l'IA</title>
        <meta
          name="description"
          content="UNPRO aide les propriétaires à prendre de meilleures décisions de rénovation grâce à l'IA, à des recommandations personnalisées et au jumelage avec le bon entrepreneur — pas seulement trois soumissions."
        />
        <link rel="canonical" href="https://unpro.ca/" />
      </Helmet>

      <div className="bg-background w-full max-w-full overflow-x-hidden">
        <HeroLeBon onTrackCta={trackCta} />
        <SectionWhyThisContractor />
        <SectionWhyCompare3Quotes />
        <SectionContractorPitch onTrackCta={trackCta} />
        <SectionWhatHomeownerSees />
        <SectionDualCtaFinal onTrackCta={trackCta} />
      </div>
    </>
  );
}
