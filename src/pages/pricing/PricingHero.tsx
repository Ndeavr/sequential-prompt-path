import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, CalendarCheck, ShieldCheck, Ban, Recycle, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

const KEY_POINTS = [
  { icon: CalendarCheck, text: "1 projet → 1 seul entrepreneur. Jamais 3 soumissions." },
  { icon: Ban, text: "Pas de leads partagés. Pas de guerre de prix." },
  { icon: Recycle, text: "Pas de leads recyclés ni revendus." },
  { icon: MapPin, text: "Places limitées par spécialité et par ville." },
];

export default function PricingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute top-[-20%] left-[10%] w-[50vw] h-[50vw] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[5%] w-[30vw] h-[30vw] rounded-full bg-secondary/6 blur-[100px] pointer-events-none" />

      <div className="relative z-10 text-center px-5 pt-28 pb-14 md:pt-36 md:pb-20 max-w-3xl mx-auto">
        <motion.div className="space-y-6" initial="hidden" animate="visible">
          <motion.div variants={fadeUp} custom={0}>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1.5">
              <CalendarCheck className="h-3.5 w-3.5 mr-1.5" /> Rendez-vous exclusifs
            </Badge>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
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
            <span className="text-muted-foreground text-lg md:text-xl font-normal mt-3 block">
              Pas des leads partagés.
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            UNPRO connecte les propriétaires avec les bons entrepreneurs selon leur spécialité, leur localité, leur capacité réelle et leur niveau de plan.
          </motion.p>

          {/* Key points */}
          <motion.div variants={fadeUp} custom={3} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
            {KEY_POINTS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-xs text-muted-foreground">{text}</span>
              </div>
            ))}
          </motion.div>

          {/* Scarcity note */}
          <motion.p variants={fadeUp} custom={4} className="text-xs text-muted-foreground/70 max-w-md mx-auto">
            Certaines combinaisons métier + localité peuvent devenir complètes afin de préserver la qualité des recommandations et la rentabilité des entrepreneurs en place.
          </motion.p>

          <motion.div variants={fadeUp} custom={5} className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild size="lg" className="rounded-2xl h-13 px-8 text-base shadow-glow">
              <Link to="/signup?type=contractor">
                Voir les plans <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-2xl h-13 px-8 text-base">
              <Link to="/comment-ca-marche">
                <Play className="h-4 w-4 mr-2" /> Comment ça fonctionne
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
