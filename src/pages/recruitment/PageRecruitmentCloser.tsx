import { useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import HeroSectionCloser from "@/components/recruitment/HeroSectionCloser";
import ProofSectionEarnings from "@/components/recruitment/ProofSectionEarnings";
import HowItWorksSection from "@/components/recruitment/HowItWorksSection";
import OfferGridSection from "@/components/recruitment/OfferGridSection";
import ComparisonSection from "@/components/recruitment/ComparisonSection";
import IncomeSimulatorWidget from "@/components/recruitment/IncomeSimulatorWidget";
import TestimonialsSectionCloser from "@/components/recruitment/TestimonialsSectionCloser";
import ObjectionSection from "@/components/recruitment/ObjectionSection";
import FormApplicationCloser from "@/components/recruitment/FormApplicationCloser";
import CTAStickyApply from "@/components/recruitment/CTAStickyApply";

export default function PageRecruitmentCloser() {
  const simulatorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <>
      <Helmet>
        <title>Représentant terrain — Carrières UNPRO</title>
        <meta name="description" content="Job d'été, temps partiel ou permanent. Rencontre des entrepreneurs, crée leur profil IA, encaisse des commissions récurrentes. Pas de cold call." />
        <link rel="canonical" href="https://sequential-prompt-path.lovable.app/carrieres/representant" />
      </Helmet>

      <HeroSectionCloser
        onSimulate={() => scrollTo(simulatorRef)}
        onApply={() => scrollTo(formRef)}
      />
      <ProofSectionEarnings />
      <HowItWorksSection />
      <OfferGridSection />
      <ComparisonSection />
      <IncomeSimulatorWidget ref={simulatorRef} />
      <TestimonialsSectionCloser />
      <ObjectionSection />
      <FormApplicationCloser ref={formRef} />
      <CTAStickyApply onApply={() => scrollTo(formRef)} />

      <div className="h-20 md:hidden" />
    </>
  );
}