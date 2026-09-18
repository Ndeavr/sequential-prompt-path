/**
 * UNPRO — Homeowner Pricing Page (standalone)
 * Dedicated page — no toggle. Cross-link to entrepreneur page.
 */
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Wrench, ArrowRight } from "lucide-react";
import HomeownerPlans from "./pricing/HomeownerPlans";
import PricingHeroHomeowners from "./pricing/PricingHeroHomeowners";
import PricingFaq from "./pricing/PricingFaq";
import PricingCta from "./pricing/PricingCta";

export default function PricingHomeownersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Tarifs Propriétaires — UNPRO</title>
        <meta
          name="description"
          content="Plans pour propriétaires : trouvez les bons entrepreneurs vérifiés au Québec, avec rendez-vous garantis."
        />
        <link rel="canonical" href="https://unpro.ca/pricing/proprietaires" />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <PricingHeroHomeowners />
        <HomeownerPlans />

        {/* Cross-link entrepreneurs — parcours entrepreneur, jamais un plan maison */}
        <section className="px-5 py-8">
          <div className="max-w-3xl mx-auto">
            <Link
              to={contractorPlanLink({ objective: "more_appointments", from: "homeowner_pricing" })}
              data-testid="homeowner-pricing-contractor-card"
              className="group flex items-center justify-between gap-4 p-5 rounded-2xl border border-border/40 bg-card hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm">
                    Découvrez votre plan personnalisé
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Selon votre métier, vos services, votre territoire et votre capacité.
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
