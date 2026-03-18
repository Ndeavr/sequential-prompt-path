/**
 * UNPRO — Pricing Page
 * Connected to calculator session for plan pre-selection.
 */
import { useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import PricingHero from "./pricing/PricingHero";
import HomeownerPlans from "./pricing/HomeownerPlans";
import ContractorPlans from "./pricing/ContractorPlans";
import SignaturePlan from "./pricing/SignaturePlan";
import AppointmentCalculator from "./pricing/AppointmentCalculator";
import PlatformComparison from "./pricing/PlatformComparison";
import AppointmentPricing from "./pricing/AppointmentPricing";
import PricingFaq from "./pricing/PricingFaq";
import PricingCta from "./pricing/PricingCta";
import { getCalculatorSession } from "@/services/calculatorSessionService";
import { motion } from "framer-motion";

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const preSelectedPlan = searchParams.get("plan");
  const session = getCalculatorSession();
  const contractorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to contractor plans if coming from calculator
  useEffect(() => {
    if (preSelectedPlan && contractorRef.current) {
      setTimeout(() => {
        contractorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
    }
  }, [preSelectedPlan]);

  return (
    <div className="min-h-screen bg-background">
      <PricingHero />

      {/* Calculator recommendation banner */}
      {session && preSelectedPlan && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto px-5 -mt-4 mb-6"
        >
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-card to-accent/10 border border-primary/20 p-5 md:p-6">
            <p className="text-sm font-bold text-foreground mb-1">
              📊 Selon vos objectifs, le plan <span className="text-primary capitalize">{session.recommendedPlan === "elite" ? "Élite" : session.recommendedPlan}</span> est le plus adapté.
            </p>
            <p className="text-xs text-muted-foreground">
              Vous souhaitez atteindre{" "}
              <strong className="text-foreground">{session.revenueGoal.toLocaleString()} $ / mois</strong>
              {" "}avec environ{" "}
              <strong className="text-foreground">{session.estimatedAppointments} rendez-vous garantis</strong>
              {" "}par mois.
            </p>
          </div>
        </motion.div>
      )}

      <HomeownerPlans />
      <div ref={contractorRef}>
        <ContractorPlans preSelectedPlan={preSelectedPlan} />
      </div>
      <SignaturePlan />
      <AppointmentCalculator />
      <PlatformComparison />
      <AppointmentPricing />
      <PricingFaq />
      <PricingCta />
    </div>
  );
}
