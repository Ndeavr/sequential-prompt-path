/**
 * UNPRO — Pricing Page
 * Des rendez-vous exclusifs. Pas des leads partagés.
 */

import PricingHero from "./pricing/PricingHero";
import HomeownerPlans from "./pricing/HomeownerPlans";
import ContractorPlans from "./pricing/ContractorPlans";
import SignaturePlan from "./pricing/SignaturePlan";
import AppointmentCalculator from "./pricing/AppointmentCalculator";
import PlatformComparison from "./pricing/PlatformComparison";
import AppointmentPricing from "./pricing/AppointmentPricing";
import PricingFaq from "./pricing/PricingFaq";
import PricingCta from "./pricing/PricingCta";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PricingHero />
      <HomeownerPlans />
      <ContractorPlans />
      <SignaturePlan />
      <AppointmentCalculator />
      <PlatformComparison />
      <AppointmentPricing />
      <PricingFaq />
      <PricingCta />
    </div>
  );
}
