import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, ArrowRight, Shield, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

interface Props {
  ctaHref?: string;
}

export default function HeroSectionAnalyseTroisSoumissions({ ctaHref = "/analyse-soumissions/importer" }: Props) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-[-10%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center px-5 pt-20 pb-14 md:pt-32 md:pb-20">
        <motion.div className="space-y-5 max-w-lg" initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-primary/8 text-primary text-xs font-semibold">
            <Brain className="h-3 w-3" /> Analyse IA comparative
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            Analysez jusqu'à <span className="text-primary">3 soumissions</span> en 30 secondes
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-sm text-muted-foreground max-w-sm mx-auto">
            Importez vos soumissions d'entrepreneurs. Notre IA compare les prix, garanties, couvertures et détecte les risques.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="rounded-2xl shadow-glow">
              <Link to={ctaHref}>Analyser jusqu'à 3 soumissions <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-2xl">
              <Link to="/compare-quotes">Voir un exemple d'analyse</Link>
            </Button>
          </motion.div>
          <motion.div variants={fadeUp} custom={4} className="flex items-center justify-center gap-4 pt-2">
            {[
              { icon: CheckCircle2, label: "100% gratuit" },
              { icon: Shield, label: "Données privées" },
              { icon: Brain, label: "IA comparative" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-1">
                <b.icon className="h-3 w-3 text-emerald-500" />
                <span className="text-xs font-medium text-muted-foreground">{b.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
