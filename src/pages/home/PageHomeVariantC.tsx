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
        <title>Trouvez le bon entrepreneur — UNPRO</title>
        <meta
          name="description"
          content="Pas le plus visible. Pas le moins cher. Le bon. UNPRO recommande l'entrepreneur qui correspond réellement à votre projet."
        />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
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
