/**
 * UNPRO — Pricing Page
 * Split into two tabs: Propriétaires and Entrepreneurs.
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Wrench } from "lucide-react";
import HomeownerPlans from "./pricing/HomeownerPlans";
import ContractorPlans from "./pricing/ContractorPlans";
import PricingHero from "./pricing/PricingHero";
import PricingHeroHomeowners from "./pricing/PricingHeroHomeowners";
import SubscriptionExplainer from "./pricing/SubscriptionExplainer";
import AppointmentCalculator from "./pricing/AppointmentCalculator";
import PlatformComparison from "./pricing/PlatformComparison";
import AppointmentPricing from "./pricing/AppointmentPricing";
import PricingFaq from "./pricing/PricingFaq";
import PricingCta from "./pricing/PricingCta";
import { getCalculatorSession } from "@/services/calculatorSessionService";

type PricingTab = "proprietaires" | "entrepreneurs";

export default function PricingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preSelectedPlan = searchParams.get("plan");
  const tabParam = searchParams.get("tab") as PricingTab | null;
  const session = getCalculatorSession();
  const contractorRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<PricingTab>(
    tabParam === "entrepreneurs" ? "entrepreneurs" : "proprietaires"
  );

  const handleTabChange = (tab: PricingTab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (preSelectedPlan && activeTab === "entrepreneurs" && contractorRef.current) {
      setTimeout(() => {
        contractorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
    }
  }, [preSelectedPlan, activeTab]);

  return (
    <div className="min-h-screen bg-background">
      {/* Tab Toggle — sticky on mobile */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex rounded-2xl p-1 bg-muted/40 border border-border/30">
            <TabButton
              active={activeTab === "proprietaires"}
              onClick={() => handleTabChange("proprietaires")}
              icon={<Home className="w-4 h-4" />}
              label="Propriétaires"
            />
            <TabButton
              active={activeTab === "entrepreneurs"}
              onClick={() => handleTabChange("entrepreneurs")}
              icon={<Wrench className="w-4 h-4" />}
              label="Entrepreneurs"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "proprietaires" ? (
          <motion.div
            key="proprietaires"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <PricingHeroHomeowners />
            <HomeownerPlans />
            <PricingFaq />
            <PricingCta />
          </motion.div>
        ) : (
          <motion.div
            key="entrepreneurs"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <PricingHero />

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

            <div ref={contractorRef}>
              <ContractorPlans preSelectedPlan={preSelectedPlan} />
            </div>
            <SubscriptionExplainer />
            <AppointmentCalculator />
            <AppointmentPricing />
            <PlatformComparison />
            <PricingFaq />
            <PricingCta />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground/70"
      }`}
    >
      {active && (
        <motion.div
          layoutId="pricing-tab-bg"
          className="absolute inset-0 bg-card border border-border/40 rounded-xl shadow-sm"
          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );
}
