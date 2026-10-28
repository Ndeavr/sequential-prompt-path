/**
 * Page forfaits propriétaires — présentation compacte, mobile-first.
 * Les entrepreneurs suivent uniquement leur parcours de plan personnalisé.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, BriefcaseBusiness, Home } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { contractorPlanLink } from "@/lib/routing/contractorPlanRoute";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

export default function PricingHeroHomeowners() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 hero-gradient pointer-events-none" />
      <div className="absolute -top-24 left-1/4 w-72 h-72 rounded-full bg-primary/8 blur-[100px] pointer-events-none" />
      <div className="relative z-10 max-w-3xl mx-auto px-5 pt-8 pb-4 md:pt-14 md:pb-8">
        <motion.div initial="hidden" animate="visible" className="flex flex-col items-center text-center gap-3 md:gap-4">
          <motion.div variants={fadeUp} custom={0}>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1">
              <Home className="h-3.5 w-3.5 mr-1.5" /> Pour les propriétaires
            </Badge>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="max-w-2xl text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            Prenez de meilleures décisions pour votre maison.
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="text-sm md:text-base text-muted-foreground max-w-xl leading-relaxed">
            Comparez vos soumissions, vérifiez les entrepreneurs et gardez l’historique de votre propriété avec Clara.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row w-full sm:w-auto gap-2.5 sm:gap-3 pt-1">
            <Button asChild size="lg" className="rounded-xl min-h-11 px-6 text-sm sm:text-base shadow-glow">
              <Link to="/signup?redirect=/proprietaire/bienvenue?plan=discovery">
                Commencer gratuitement <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl min-h-11 px-6 text-sm sm:text-base">
              <Link to={contractorPlanLink({ objective: "more_appointments", from: "homeowner_pricing" })} data-testid="homeowner-pricing-contractor-link">
                <BriefcaseBusiness className="h-4 w-4 mr-2" /> Je suis entrepreneur
              </Link>
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} custom={4} className="text-xs text-muted-foreground">
            Compte gratuit, sans carte bancaire. Découvrez les options ci-dessous.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
