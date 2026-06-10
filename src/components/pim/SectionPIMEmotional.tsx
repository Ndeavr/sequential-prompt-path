/**
 * SectionPIMEmotional — bloc émotionnel "Une maison accumule des souvenirs".
 * Positionnement mémoire / patrimoine, sans aucune mention d'IA.
 */
import { motion } from "framer-motion";

const LINES = [
  "Une maison accumule des souvenirs.",
  "Mais les documents se perdent.",
  "Les garanties disparaissent.",
  "Les rénovations sont oubliées.",
];

export default function SectionPIMEmotional() {
  return (
    <section className="relative px-4 sm:px-6 py-24 sm:py-32 overflow-hidden">
      <div
        className="absolute inset-0 -z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(125,211,252,0.10), transparent 60%)",
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center">
        <span className="inline-block text-[11px] tracking-[0.18em] uppercase text-cyan-300/80 mb-6">
          Pourquoi le Passeport Maison
        </span>

        <div className="space-y-3 sm:space-y-4">
          {LINES.map((line, i) => (
            <motion.p
              key={line}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-white/85 leading-snug"
            >
              {line}
            </motion.p>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-10 text-base sm:text-lg text-white/65 leading-relaxed max-w-2xl mx-auto"
        >
          Le Passeport Intelligence Maison conserve l'histoire complète de votre
          propriété afin que rien d'important ne soit perdu.
        </motion.p>
      </div>
    </section>
  );
}
