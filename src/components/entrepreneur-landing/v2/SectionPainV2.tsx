/**
 * SectionPainV2 — "Fatigué de payer pour rien?"
 * Mobile-first, glass cards, tight rhythm.
 */
import { motion } from "framer-motion";

const PAINS = [
  "Leads envoyés à 5 compétiteurs",
  "Clics sans intention réelle",
  "Temps perdu à relancer",
  "Soumissions ghostées",
  "Marketing qui ne convertit pas",
];

export default function SectionPainV2() {
  return (
    <section className="px-5 py-12">
      <div className="max-w-md mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center mb-6"
        >
          Fatigué de payer pour rien?
        </motion.h2>

        <div className="space-y-2.5">
          {PAINS.map((pain, i) => (
            <motion.div
              key={pain}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-destructive/15 bg-destructive/5 backdrop-blur-sm"
            >
              <span className="text-destructive text-lg leading-none shrink-0">✕</span>
              <span className="text-sm text-foreground/90">{pain}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
