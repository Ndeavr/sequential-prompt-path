/**
 * SectionNoMoreQuotes — Explanatory section with true glass surface.
 */
import { motion } from "framer-motion";

export default function SectionNoMoreQuotes() {
  return (
    <section className="px-5 py-14 md:py-20">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card-elevated rounded-3xl p-6 sm:p-8 space-y-5 light-ray-fx"
        >
          <h2 className="font-display text-[20px] sm:text-[26px] md:text-[32px] font-bold text-foreground leading-tight relative z-10">
            Comparer 3 soumissions<span className="text-primary"> ?</span>
          </h2>

          <div className="space-y-4 text-sm sm:text-base leading-relaxed relative z-10">
            <p className="text-muted-foreground">
              L'IA ne se contente plus de comparer des prix.
            </p>
            <p className="text-muted-foreground">
              Elle comprend votre situation, analyse vos besoins et identifie directement le bon professionnel.
            </p>
            <p className="text-muted-foreground">
              Fini les 3 soumissions, les délais inutiles et les mauvaises surprises.
            </p>
            <p className="text-foreground font-semibold">
              Vous passez de la comparaison à la décision.
            </p>
          </div>

          <div className="pt-3 border-t border-border/40 space-y-1 relative z-10">
            <p className="text-base sm:text-lg font-bold text-foreground">
              Une seule recommandation.
            </p>
            <p className="text-base sm:text-lg font-bold text-gradient">
              La bonne.
            </p>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground italic pt-2 relative z-10">
            Si votre maison pouvait parler… voici ce qu'elle ferait.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
