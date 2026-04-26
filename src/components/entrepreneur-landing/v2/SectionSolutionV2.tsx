/**
 * SectionSolutionV2 — "UNPRO change les règles."
 */
import { motion } from "framer-motion";

const SOLUTIONS = [
  "Rendez-vous qualifiés",
  "Clients déjà motivés",
  "Demandes locales ciblées",
  "Moins de temps perdu",
  "Plus haut taux de fermeture",
  "Croissance prévisible",
];

export default function SectionSolutionV2() {
  return (
    <section className="px-5 py-12">
      <div className="max-w-md mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center mb-6"
        >
          UNPRO <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">change les règles</span>.
        </motion.h2>

        <div className="space-y-2.5">
          {SOLUTIONS.map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-success/20 bg-success/5 backdrop-blur-sm"
            >
              <span className="text-success text-lg leading-none shrink-0">✓</span>
              <span className="text-sm text-foreground/90 font-medium">{s}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
