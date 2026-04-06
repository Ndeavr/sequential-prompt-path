/**
 * UNPRO — Condos Pricing Page
 * Direct unit-to-price mapping. Premium mobile-first.
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import HeroSectionCondosPricing from "@/components/condos-pricing/HeroSectionCondosPricing";
import SliderUnitsDirectPricing from "@/components/condos-pricing/SliderUnitsDirectPricing";
import CardPricingResultCondos from "@/components/condos-pricing/CardPricingResultCondos";
import DisplayUnitsToPriceMapping from "@/components/condos-pricing/DisplayUnitsToPriceMapping";
import SectionCondosIncludedFeatures from "@/components/condos-pricing/SectionCondosIncludedFeatures";
import SectionCondosPricingCTA from "@/components/condos-pricing/SectionCondosPricingCTA";

export default function CondosPricingPage() {
  const [units, setUnits] = useState(24);

  const handleUnitsChange = useCallback((v: number) => {
    setUnits(Math.max(2, Math.min(300, Math.round(v))));
  }, []);

  return (
    <>
      <Helmet>
        <title>Tarifs Condos — UNPRO</title>
        <meta name="description" content="Nombre d'unités = votre prix. Calculez instantanément le coût pour votre immeuble avec UNPRO." />
      </Helmet>

      <div className="dark min-h-screen bg-background text-foreground overflow-x-hidden">
        {/* Aura BG */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] rounded-full bg-secondary/[0.04] blur-[100px]" />
        </div>

        <main className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-12">
          <HeroSectionCondosPricing />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="space-y-6"
          >
            <SliderUnitsDirectPricing units={units} onChange={handleUnitsChange} />
            <CardPricingResultCondos units={units} />
          </motion.div>

          <DisplayUnitsToPriceMapping currentUnits={units} />
          <SectionCondosIncludedFeatures units={units} />
          <SectionCondosPricingCTA units={units} />
        </main>
      </div>
    </>
  );
}
