import ContractorAffiliateTeaser from "@/components/contractor/ContractorAffiliateTeaser";
import { Link, useLocation } from "react-router-dom";
import { campaignLink } from "@/lib/contractorCampaignLinks";
import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import HeroV2 from "@/components/entrepreneur-landing/v2/HeroV2";
import SectionPainV2 from "@/components/entrepreneur-landing/v2/SectionPainV2";
import SectionSolutionV2 from "@/components/entrepreneur-landing/v2/SectionSolutionV2";
import SectionSocialProofV2 from "@/components/entrepreneur-landing/v2/SectionSocialProofV2";
import SectionHowItWorksV2 from "@/components/entrepreneur-landing/v2/SectionHowItWorksV2";
import SectionPlansPreviewV2 from "@/components/entrepreneur-landing/v2/SectionPlansPreviewV2";
import SectionScarcityV2 from "@/components/entrepreneur-landing/v2/SectionScarcityV2";
import SectionFormV2 from "@/components/entrepreneur-landing/v2/SectionFormV2";
import StickyMobileCTAV2 from "@/components/entrepreneur-landing/v2/StickyMobileCTAV2";

const PageEntrepreneursLanding = () => {
  const { search } = useLocation();
  const trackCta = useCallback((ctaKey: string, section: string) => {
    supabase
      .from("entrepreneur_cta_events")
      .insert({
        visitor_id: crypto.randomUUID(),
        cta_key: ctaKey,
        page_section: section,
      })
      .then(() => {});
  }, []);

  return (
    <>
      <Helmet>
        <title>Entrepreneurs — UNPRO | Rendez-vous avec des clients sérieux</title>
        <meta
          name="description"
          content="Pas des leads partagés. Des rendez-vous avec des clients sérieux. UNPRO connecte les entrepreneurs résidentiels du Québec à des propriétaires prêts à avancer. Places limitées par territoire."
        />
      </Helmet>

      <div className="min-h-screen bg-background pb-24 lg:pb-0">
        <HeroV2 onTrackCta={trackCta} />
        <SectionPainV2 />
        <SectionSolutionV2 />
        <SectionSocialProofV2 />
        <SectionHowItWorksV2 />
        <SectionPlansPreviewV2 onTrackCta={trackCta} />
        <div className="mx-auto max-w-4xl px-5">
          <Link to={campaignLink("/credit-promotionnel", search)} className="block rounded-2xl border border-primary/25 bg-primary/5 p-5 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2">
            <span className="block font-semibold">Êtes-vous admissible à 1 000 $ de crédit promotionnel?</span>
            <span className="mt-1 block text-sm text-muted-foreground">Avec un forfait admissible de 1 000 $ ou plus. Vérifier ici →</span>
          </Link>
          <ContractorAffiliateTeaser />
        </div>
        <SectionScarcityV2 onTrackCta={trackCta} />
        <SectionFormV2 onTrackCta={trackCta} />
        <StickyMobileCTAV2 onTrackCta={trackCta} />
      </div>
    </>
  );
};

export default PageEntrepreneursLanding;
