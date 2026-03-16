import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

export default function PricingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute top-[-20%] left-[10%] w-[50vw] h-[50vw] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[5%] w-[30vw] h-[30vw] rounded-full bg-secondary/6 blur-[100px] pointer-events-none" />

      <div className="relative z-10 text-center px-5 pt-32 pb-16 md:pt-40 md:pb-24 max-w-3xl mx-auto">
        <motion.div className="space-y-6" initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0}>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1.5">
              <CalendarCheck className="h-3.5 w-3.5 mr-1.5" /> Rendez-vous exclusifs
            </Badge>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Recevez des{" "}
            <span className="relative inline-block">
              <span className="text-gradient">rendez-vous garantis</span>
              <motion.span
                className="absolute -bottom-1 left-0 w-full h-[3px] bg-primary/40 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                style={{ transformOrigin: "left" }}
              />
            </span>
            .
            <br />
            <span className="text-muted-foreground text-xl md:text-2xl font-normal mt-3 block">
              Pas des leads partagés.
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground max-w-lg mx-auto">
            UNPRO connecte les propriétaires avec les bons entrepreneurs. Chaque projet est envoyé à <strong className="text-foreground">un seul entrepreneur</strong> à la fois.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild size="lg" className="rounded-2xl h-13 px-8 text-base shadow-glow">
              <Link to="/signup?type=contractor">
                Créer mon profil entrepreneur <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-2xl h-13 px-8 text-base">
              <Link to="/comment-ca-marche">
                <Play className="h-4 w-4 mr-2" /> Voir comment ça fonctionne
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
