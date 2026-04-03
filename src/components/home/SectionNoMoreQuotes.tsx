/**
 * SectionNoMoreQuotes — Explanatory bubble about why UNPRO replaces 3 quotes.
 * Clean, premium, text-focused.
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
          className="glass-card rounded-3xl p-6 sm:p-8 space-y-5"
        >
          <h2 className="font-display text-[20px] sm:text-[26px] md:text-[32px] font-bold text-foreground leading-tight">
            Comparer 3 soumissions<span className="text-primary"> ?</span>
          </h2>

          <div className="space-y-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
            <p>
              L'IA ne se contente plus de comparer des prix.
            </p>
            <p>
              Elle comprend votre situation, analyse vos besoins et identifie directement le bon professionnel.
            </p>
            <p>
              Fini les 3 soumissions, les délais inutiles et les mauvaises surprises.
            </p>
            <p className="text-foreground font-semibold">
              Vous passez de la comparaison à la décision.
            </p>
          </div>

          <div className="pt-3 border-t border-border/40 space-y-1">
            <p className="text-base sm:text-lg font-bold text-foreground">
              Une seule recommandation.
            </p>
            <p className="text-base sm:text-lg font-bold text-primary">
              La bonne.
            </p>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground/70 italic pt-2">
            Si votre maison pouvait parler… voici ce qu'elle ferait.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
