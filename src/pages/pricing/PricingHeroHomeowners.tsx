/**
 * UNPRO — En-tête de tarification ultracompact.
 * Séparer clairement les deux audiences sans afficher de tarifs génériques entrepreneurs.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BriefcaseBusiness, House } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { contractorPlanLink } from "@/lib/routing/contractorPlanRoute";

const entrepreneurLink = contractorPlanLink({ from: "pricing_proprietaires_audience" });

export default function PricingHeroHomeowners() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 hero-gradient pointer-events-none" />
      <div className="absolute -top-28 left-1/4 h-72 w-72 rounded-full bg-primary/8 blur-[100px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-5 pb-3 sm:px-5 md:pt-8 md:pb-6">
        <nav aria-label="Choisir le type de forfait" className="mb-5 md:mb-7">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-card/50 p-1.5 border border-border/35">
            <div
              aria-current="page"
              className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-primary/12 border border-primary/30 px-2 py-2 text-center text-xs font-bold leading-snug text-primary sm:text-sm"
            >
              <House className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Pour les propriétaires</span>
            </div>
            <Link
              to={entrepreneurLink}
              data-testid="pricing-audience-entrepreneur"
              className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-2 py-2 text-center text-xs font-bold leading-snug text-foreground transition-colors hover:border-primary/60 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
            >
              <BriefcaseBusiness className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Pour les entrepreneurs</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            </Link>
          </div>
        </nav>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="text-center">
          <Badge className="mb-2 bg-primary/10 text-primary border-primary/20 text-[11px] px-3 py-1">
            Passeport Maison · Clara
          </Badge>
          <h1 className="mx-auto max-w-2xl text-2xl font-extrabold tracking-tight leading-tight text-foreground sm:text-3xl md:text-4xl">
            Le bon forfait pour votre maison.
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Comparez vos soumissions, vérifiez les entrepreneurs et gardez votre maison organisée avec Clara.
          </p>
          <div className="mt-4 flex justify-center">
            <Button asChild size="lg" className="min-h-11 w-full rounded-xl px-6 text-sm font-semibold shadow-glow sm:w-auto">
              <Link to="/signup?redirect=/proprietaire/bienvenue?plan=discovery">
                Commencer gratuitement <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
