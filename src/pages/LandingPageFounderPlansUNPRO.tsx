
import { Helmet } from "react-helmet-async";
import { useFounderPlans } from "@/hooks/useFounderPlans";
import HeroSectionFounderScarcity from "@/components/founder-plans/HeroSectionFounderScarcity";
import SectionCheckAvailabilityFounder from "@/components/founder-plans/SectionCheckAvailabilityFounder";
import SectionPlanComparisonEliteSignature from "@/components/founder-plans/SectionPlanComparisonEliteSignature";
import SectionValueStackBreakdown from "@/components/founder-plans/SectionValueStackBreakdown";
import SectionWhyFounderPlans from "@/components/founder-plans/SectionWhyFounderPlans";
import SectionTerritoryLockExplanation from "@/components/founder-plans/SectionTerritoryLockExplanation";
import SectionFAQFounderPlans from "@/components/founder-plans/SectionFAQFounderPlans";
import SectionFinalCTAFounder from "@/components/founder-plans/SectionFinalCTAFounder";

export default function LandingPageFounderPlansUNPRO() {
  const { data: plans, isLoading } = useFounderPlans();

  const elite = plans?.find((p) => p.slug === "elite-fondateur");
  const signature = plans?.find((p) => p.slug === "signature-fondateur");

  return (
    <>
      <Helmet>
        <title>Plans Fondateurs — UNPRO</title>
        <meta name="description" content="Accès exclusif 10 ans. 30 places par plan. Verrouillage territoire IA. Plans Fondateurs UNPRO pour entrepreneurs ambitieux." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <HeroSectionFounderScarcity elite={elite} signature={signature} isLoading={isLoading} />
        <SectionCheckAvailabilityFounder />
        <SectionPlanComparisonEliteSignature elite={elite} signature={signature} isLoading={isLoading} />
        <SectionValueStackBreakdown />
        <SectionWhyFounderPlans />
        <SectionTerritoryLockExplanation />
        <SectionFAQFounderPlans />
        <SectionFinalCTAFounder elite={elite} signature={signature} />
      </div>
    </>
  );
}
