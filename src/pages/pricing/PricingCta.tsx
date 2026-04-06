import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Calculator } from "lucide-react";
import { motion } from "framer-motion";

export default function PricingCta() {
  return (
    <section className="px-5 py-20">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="relative rounded-3xl overflow-hidden bg-card border border-border p-10 md:p-14 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
            <div className="absolute top-[-20%] left-[30%] w-[40%] h-[40%] rounded-full bg-primary/8 blur-[80px] pointer-events-none" />

            <div className="relative">
              <Sparkles className="h-10 w-10 text-primary mx-auto mb-5" />
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Recevez des rendez-vous exclusifs
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Pas de leads partagés. Pas de guerre de prix.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="rounded-2xl h-13 px-8 text-base shadow-glow">
                  <Link to="/signup?type=contractor">
                    Voir les plans <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-2xl h-13 px-8 text-base">
                  <a href="#calculateur">
                    <Calculator className="h-4 w-4 mr-2" /> Simuler ma croissance
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
