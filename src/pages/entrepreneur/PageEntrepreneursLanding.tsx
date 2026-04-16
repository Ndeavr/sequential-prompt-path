import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import HeroSectionEntrepreneurs from "@/components/entrepreneur-landing/HeroSectionEntrepreneurs";
import SectionPainToOutcome from "@/components/entrepreneur-landing/SectionPainToOutcome";
import SectionNoSharedLeads from "@/components/entrepreneur-landing/SectionNoSharedLeads";
import SectionScoreAndRevenue from "@/components/entrepreneur-landing/SectionScoreAndRevenue";
import SectionHowItWorks from "@/components/entrepreneur-landing/SectionHowItWorks";
import SectionAlexConsultation from "@/components/entrepreneur-landing/SectionAlexConsultation";
import SectionObjectivesToPlan from "@/components/entrepreneur-landing/SectionObjectivesToPlan";
import SectionTerritories from "@/components/entrepreneur-landing/SectionTerritories";
import SectionFAQEntrepreneurs from "@/components/entrepreneur-landing/SectionFAQEntrepreneurs";
import SectionFinalCTA from "@/components/entrepreneur-landing/SectionFinalCTA";
import StickyMobileCTAEntrepreneur from "@/components/entrepreneur-landing/StickyMobileCTAEntrepreneur";
import SectionLandingContractorProofOfSavings from "@/components/impact-counter/SectionLandingContractorProofOfSavings";

const PageEntrepreneursLanding = () => {
  const trackCta = useCallback((ctaKey: string, section: string) => {
    supabase.from("entrepreneur_cta_events").insert({
      visitor_id: crypto.randomUUID(),
      cta_key: ctaKey,
      page_section: section,
    }).then(() => {});
  }, []);

  return (
    <>
      <Helmet>
        <title>Entrepreneurs — UNPRO | Rendez-vous qualifiés par l'IA</title>
        <meta name="description" content="Recevez des rendez-vous qualifiés, non partagés. UNPRO connecte les entrepreneurs résidentiels aux bons clients grâce à l'IA. Places limitées par ville." />
      </Helmet>

      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <HeroSectionEntrepreneurs onTrackCta={trackCta} />
        <SectionPainToOutcome />
        <SectionNoSharedLeads />
        <SectionScoreAndRevenue onTrackCta={trackCta} />
        <SectionHowItWorks />
        <SectionAlexConsultation onTrackCta={trackCta} />
        <SectionObjectivesToPlan onTrackCta={trackCta} />
        <SectionTerritories onTrackCta={trackCta} />
        <SectionLandingContractorProofOfSavings />
        <SectionFAQEntrepreneurs />
        <SectionFinalCTA onTrackCta={trackCta} />
        <StickyMobileCTAEntrepreneur onTrackCta={trackCta} />
      </div>
    </>
  );
};

export default PageEntrepreneursLanding;
