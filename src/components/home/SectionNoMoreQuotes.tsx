/**
 * SectionNoMore3QuotesProof — Social proof destroying the "3 quotes" myth.
 * Premium glassmorphism with Alex match card reveal.
 */
import { motion } from "framer-motion";
import { CheckCircle2, Star, ArrowRight, Shield, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import unproRobot from "@/assets/unpro-robot.png";

const MATCH = {
  name: "Isolation Solution Royal",
  badge: "Recommandé UNPRO",
  score: 92,
  location: "Laval / Montréal",
  services: ["Isolation d'entretoit", "Vermiculite", "Barrage de glace"],
  rating: 4.9,
  reviews: 312,
  quote: "Très professionnel, travail impeccable, économie de chauffage notable.",
  slug: "isolation-solution-royal",
};

export default function SectionNoMoreQuotes() {
  return (
    <section className="px-5 py-14 md:py-20">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-[22px] sm:text-[28px] md:text-[36px] font-bold text-foreground leading-tight">
            Plus besoin de comparer{" "}
            <span className="text-primary">3 soumissions.</span>
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            Rencontrez le bon professionnel du premier coup.
          </p>
        </motion.div>

        {/* Alex bubble */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-start gap-3 max-w-md mb-4"
        >
          <div className="relative shrink-0">
            <img src={unproRobot} alt="Alex" className="h-11 w-11 rounded-full object-cover" />
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success border-2 border-background" />
          </div>
          <div className="rounded-2xl rounded-tl-md px-4 py-3 glass-card shadow-[var(--shadow-md)]">
            <p className="text-sm font-medium text-foreground">J'ai trouvé le match parfait pour vous.</p>
          </div>
        </motion.div>

        {/* Match card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="glass-card rounded-3xl p-5 sm:p-6 shadow-[var(--shadow-xl)]"
        >
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden bg-muted/50 border border-border/50 shrink-0 flex items-center justify-center">
              <img src={unproRobot} alt={MATCH.name} className="h-12 w-12 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-bold text-foreground">{MATCH.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> {MATCH.badge}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                  {MATCH.score}/100
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {MATCH.location}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            {MATCH.services.map((svc) => (
              <div key={svc} className="flex items-center gap-2 text-sm text-foreground/80">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{svc}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center gap-1 mb-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-3.5 w-3.5 fill-current text-warning" />
              ))}
              <span className="text-xs font-bold text-foreground ml-1">{MATCH.rating}</span>
              <span className="text-[10px] text-muted-foreground ml-0.5">({MATCH.reviews})</span>
            </div>
            <p className="text-xs text-muted-foreground italic">"{MATCH.quote}"</p>
          </div>

          <div className="mt-5 flex gap-2.5">
            <Link
              to={`/pro/${MATCH.slug}`}
              className="flex-1 h-11 rounded-xl flex items-center justify-center text-xs font-bold bg-card border border-border text-foreground hover:bg-muted/50 transition-all active:scale-[0.97]"
            >
              Voir le profil
            </Link>
            <Link
              to={`/book/${MATCH.slug}`}
              className="flex-1 h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold cta-gradient active:scale-[0.97]"
            >
              Planifier un rendez-vous <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
