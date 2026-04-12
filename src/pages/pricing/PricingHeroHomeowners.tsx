/**
 * PricingHeroHomeowners — Hero section for homeowner pricing.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

const PROOFS = [
  "Vérifiez plus vite",
  "Comparez mieux",
  "Décidez avec plus de confiance",
];

export default function PricingHeroHomeowners() {
  return (
    <section className="relative overflow-hidden landing-dot-grid">
      <div className="relative z-10 text-center px-5 pt-20 pb-12 md:pt-28 md:pb-16 max-w-3xl mx-auto">
        <motion.div className="space-y-5" initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0}>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1.5">
              <Home className="h-3.5 w-3.5 mr-1.5" /> Pour les propriétaires
            </Badge>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Choisissez le niveau d'accompagnement qui convient à votre maison.
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            UNPRO vous aide à voir plus clair, comparer intelligemment, éviter les angles morts et garder votre maison organisée au même endroit.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-wrap justify-center gap-4">
            {PROOFS.map((p) => (
              <div key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {p}
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} custom={4} className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild size="lg" className="rounded-full h-13 px-8 text-base">
              <Link to="/signup?type=homeowner&plan=discovery">
                Commencer gratuitement <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="rounded-2xl h-13 px-8 text-base text-muted-foreground"
              onClick={() => {
                document.getElementById("homeowner-plans")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Comparer les plans
            </Button>
          </motion.div>

          <motion.p variants={fadeUp} custom={5} className="text-xs text-muted-foreground/60">
            Pas de pression. Commencez avec Découverte, passez à Plus ou Signature quand vous en voyez la valeur.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
