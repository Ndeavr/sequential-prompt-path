import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGoalToPlanEngine } from "@/hooks/useGoalToPlanEngine";
import { supabase } from "@/integrations/supabase/client";
import HeroSectionSelfServe from "@/components/goal-to-plan/HeroSectionSelfServe";
import SectionCurrentReality from "@/components/goal-to-plan/SectionCurrentReality";
import SectionLostRevenue from "@/components/goal-to-plan/SectionLostRevenue";
import SectionObjectives from "@/components/goal-to-plan/SectionObjectives";
import SectionAppointmentsCalc from "@/components/goal-to-plan/SectionAppointmentsCalc";
import SectionPlanRecommendation from "@/components/goal-to-plan/SectionPlanRecommendation";
import SectionNoSharedLeadsGoal from "@/components/goal-to-plan/SectionNoSharedLeadsGoal";
import SectionCityScarcityGoal from "@/components/goal-to-plan/SectionCityScarcityGoal";
import SectionAlexAdvisor from "@/components/goal-to-plan/SectionAlexAdvisor";
import SectionFAQGoalToPlan from "@/components/goal-to-plan/SectionFAQGoalToPlan";
import SectionFinalCTAGoal from "@/components/goal-to-plan/SectionFinalCTAGoal";
import StickyMobileGoalCTA from "@/components/goal-to-plan/StickyMobileGoalCTA";
import { Helmet } from "react-helmet-async";

export default function PageEntrepreneurGoalToPlanLanding() {
  const { inputs, updateInput, results } = useGoalToPlanEngine();
  const navigate = useNavigate();
  const calcRef = useRef<HTMLDivElement>(null);

  const trackCta = useCallback((ctaKey: string, section: string) => {
    supabase.from("self_serve_goal_plan_cta_events").insert({
      cta_key: ctaKey,
      page_section: section,
    }).then(() => {});
  }, []);

  const scrollToCalc = () => {
    trackCta("scroll_calculator", "hero");
    document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
  };

  const openAlex = () => {
    trackCta("open_alex", "global");
    navigate("/alex");
  };

  const checkCity = () => {
    trackCta("check_city", "global");
    document.getElementById("city-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const activate = () => {
    trackCta("activate_plan", "cta");
    if (results) {
      navigate(`/entrepreneur/pricing?recommended=${results.recommendedPlan}`);
    } else {
      navigate("/entrepreneur/pricing");
    }
  };

  return (
    <>
      <Helmet>
        <title>Calculateur de plan entrepreneur | UNPRO</title>
        <meta name="description" content="Calculez combien de rendez-vous qualifiés il vous faut et quel plan UNPRO choisir. Moins de soumissions, plus de contrats." />
      </Helmet>

      <div className="min-h-screen bg-background pb-20 sm:pb-0">
        <HeroSectionSelfServe onCalculate={scrollToCalc} onAlex={openAlex} onCheckCity={checkCity} />

        <SectionCurrentReality
          inputs={inputs}
          onUpdate={updateInput}
          currentRevenue={results?.currentMonthlyRevenue ?? null}
          currentProfit={results?.currentMonthlyProfit ?? null}
        />

        {results && results.currentMonthlyRevenue > 0 && (
          <>
            <SectionLostRevenue results={results} />
            <SectionObjectives inputs={inputs} onUpdate={updateInput} />
            <SectionAppointmentsCalc results={results} />
            <SectionPlanRecommendation results={results} onActivate={activate} />
            <SectionNoSharedLeadsGoal />
            <div id="city-section">
              <SectionCityScarcityGoal city={inputs.city} onCheckCity={checkCity} />
            </div>
            <SectionAlexAdvisor results={results} onAlex={openAlex} />
          </>
        )}

        {!results && (
          <SectionAlexAdvisor results={null} onAlex={openAlex} />
        )}

        <SectionFAQGoalToPlan />
        <SectionFinalCTAGoal results={results} onActivate={activate} onAlex={openAlex} onCheckCity={checkCity} />

        <StickyMobileGoalCTA
          onCalculate={scrollToCalc}
          onAlex={openAlex}
          onCheckCity={checkCity}
          onActivate={activate}
          hasResults={!!results}
        />
      </div>
    </>
  );
}
