import { motion } from "framer-motion";
import PropertyIntelligenceGraph from "./PropertyIntelligenceGraph";

export default function SectionNotCloudStorage() {
  return (
    <section className="relative px-4 sm:px-6 py-24 sm:py-32 overflow-hidden">
      {/* Bande contraste fort */}
      <div
        className="absolute inset-0 -z-0"
        style={{
          background:
            "radial-gradient(circle at 30% 50%, rgba(99,102,241,0.18), transparent 55%), radial-gradient(circle at 75% 60%, rgba(34,211,238,0.10), transparent 50%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-block text-[11px] tracking-[0.18em] uppercase text-red-300/70 mb-4">
            Important
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.04em] text-white leading-[1.05]">
            PIM n'est pas un coffre à documents.
          </h2>
          <p className="mt-5 text-xl sm:text-2xl text-white/70 font-light leading-relaxed tracking-[-0.02em]">
            C'est une <span className="text-white font-medium">infrastructure d'intelligence résidentielle</span> —
            un système vivant qui relie, comprend et anticipe.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Factures", "Inspections", "Garanties", "Énergie", "Subventions", "Entrepreneurs", "Diagnostics IA"].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center"
        >
          <PropertyIntelligenceGraph variant="hero" />
        </motion.div>
      </div>
    </section>
  );
}
