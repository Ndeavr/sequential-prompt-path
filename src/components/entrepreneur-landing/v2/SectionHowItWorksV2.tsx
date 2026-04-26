/**
 * SectionHowItWorksV2 — 4 numbered steps.
 */
import { motion } from "framer-motion";

const STEPS = [
  { n: 1, title: "On valide votre entreprise" },
  { n: 2, title: "On optimise votre profil" },
  { n: 3, title: "On vous envoie des rendez-vous ciblés" },
  { n: 4, title: "Vous convertissez plus" },
];

export default function SectionHowItWorksV2() {
  return (
    <section className="px-5 py-12">
      <div className="max-w-md mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center mb-6"
        >
          Comment ça marche
        </motion.h2>

        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-4 px-4 py-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
                {s.n}
              </div>
              <span className="text-sm sm:text-base text-foreground font-medium">{s.title}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
