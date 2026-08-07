/**
 * UNPRO — Contractor Pricing Page (standalone)
 * Dedicated page — no toggle. Cross-link to homeowner page.
 */
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Home, ArrowRight } from "lucide-react";
import ContractorPlans from "./pricing/ContractorPlans";
import PricingHero from "./pricing/PricingHero";
import SubscriptionExplainer from "./pricing/SubscriptionExplainer";
import AppointmentCalculator from "./pricing/AppointmentCalculator";
import PlatformComparison from "./pricing/PlatformComparison";
import AppointmentPricing from "./pricing/AppointmentPricing";
import PricingFaq from "./pricing/PricingFaq";
import PricingCta from "./pricing/PricingCta";
import { getCalculatorSession } from "@/services/calculatorSessionService";

export default function PricingContractorsPage() {
  const [searchParams] = useSearchParams();
  const preSelectedPlan = searchParams.get("plan");
  const session = getCalculatorSession();
  const contractorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (preSelectedPlan && contractorRef.current) {
      setTimeout(() => {
        contractorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 400);
    }
  }, [preSelectedPlan]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Tarifs Entrepreneurs — UNPRO</title>
        <meta
          name="description"
          content="Plans pour entrepreneurs : recevez des rendez-vous qualifiés, développez votre entreprise et atteignez vos objectifs avec UNPRO."
        />
        <link rel="canonical" href="https://unpro.ca/pricing/entrepreneurs" />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <PricingHero />

        {/* $1 entry offer + personalized plan — above the catalog, always visible */}
        <section className="max-w-4xl mx-auto px-5 -mt-2 mb-8">
          <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5 md:p-7">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
              Offre d'entrée
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1.5">
              {TRIAL_OFFER.label} — essayez UNPRO avant de payer votre plan
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              {TRIAL_OFFER.note} Chaque plan ci-dessous démarre avec la même offre.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/entrepreneur/devis-personnalise"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="h-4 w-4" />
                Créer mon plan avec Alex
              </Link>
              <a
                href="#plans"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card px-5 py-3.5 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
              >
                Voir les plans standards
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {session && preSelectedPlan && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto px-5 mb-6"
          >
            <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-card to-accent/10 border border-primary/20 p-5 md:p-6">
              <p className="text-sm font-bold text-foreground mb-1">
                Selon vos objectifs, le plan{" "}
                <span className="text-primary">
                  {CANONICAL_PLAN_LABELS[
                    resolvePlanSlug(session.recommendedPlan)
                  ] ?? session.recommendedPlan}
                </span>{" "}
                est le plus adapté.
              </p>
              <p className="text-xs text-muted-foreground">
                Vous souhaitez atteindre{" "}
                <strong className="text-foreground">
                  {session.revenueGoal.toLocaleString()} $ / mois
                </strong>{" "}
                avec environ{" "}
                <strong className="text-foreground">
                  {session.estimatedAppointments} rendez-vous garantis
                </strong>{" "}
                par mois.
              </p>
            </div>
          </motion.div>
        )}

        <div ref={contractorRef} id="plans">
          <ContractorPlans preSelectedPlan={preSelectedPlan} />
        </div>
        <SubscriptionExplainer />
        <AppointmentCalculator />
        <AppointmentPricing />
        <PlatformComparison />

        {/* Cross-link homeowners */}
        <section className="px-5 py-8">
          <div className="max-w-3xl mx-auto">
            <Link
              to="/pricing/proprietaires"
              className="group flex items-center justify-between gap-4 p-5 rounded-2xl border border-border/40 bg-card hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm">
                    Vous êtes propriétaire ?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Découvrez les plans pour trouver le bon entrepreneur
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </div>
        </section>

        <PricingFaq />
        <PricingCta />
      </motion.div>
    </div>
  );
}
