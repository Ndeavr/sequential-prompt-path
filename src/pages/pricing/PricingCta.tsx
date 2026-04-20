import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Mic } from "lucide-react";
import { motion } from "framer-motion";

export default function PricingCta() {
  return (
    <section className="px-5 py-20">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="relative rounded-3xl overflow-hidden bg-card border border-border p-10 md:p-14 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8 pointer-events-none" />
            <div className="absolute top-[-30%] left-[20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

            <div className="relative">
              <Sparkles className="h-10 w-10 text-primary mx-auto mb-5" />
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 tracking-tight">
                Prêt à faire grandir votre entreprise ?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                Démarrez avec Premium aujourd'hui. Activation immédiate. Aucun lead partagé.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="rounded-2xl h-13 px-8 text-base shadow-glow font-semibold">
                  <a href="#plans">
                    Choisir Premium <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-2xl h-13 px-8 text-base">
                  <Link to="/alex">
                    <Mic className="h-4 w-4 mr-2" /> Parler à Alex
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
