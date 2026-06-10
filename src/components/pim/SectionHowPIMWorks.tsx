import { motion } from "framer-motion";

const STEPS = [
  { n: "01", title: "Créez votre dossier propriété",     body: "Adresse, type, année, superficie. Vous amorcez la mémoire de votre maison en moins d'une minute." },
  { n: "02", title: "Ajoutez documents et photos",       body: "Factures, inspections, garanties, soumissions, photos — classés automatiquement au même endroit." },
  { n: "03", title: "Votre maison conserve son histoire", body: "Travaux, garanties, inspections et équipements s'ajoutent automatiquement à un historique clair et durable." },
  { n: "04", title: "Continuité et tranquillité d'esprit", body: "Vous retrouvez en un instant ce qui a été fait, quand, par qui et avec quelles garanties." },
];

export default function SectionHowPIMWorks() {
  return (
    <section className="relative px-4 sm:px-6 py-20 sm:py-28">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <span className="inline-block text-[11px] tracking-[0.18em] uppercase text-cyan-300/80 mb-4">
            Comment PIM fonctionne
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.04em] text-white leading-[1.1]">
            Quatre étapes pour donner à votre maison{" "}
            <span className="text-white/50">une mémoire vivante.</span>
          </h2>
        </motion.div>

        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[28px] p-6 sm:p-7 relative overflow-hidden group transition-transform duration-[420ms]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(24px)",
              }}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-baseline justify-between mb-4">
                <span className="text-[11px] tracking-[0.18em] uppercase text-white/40">Étape</span>
                <span
                  className="text-4xl font-bold tabular-nums"
                  style={{
                    background: "linear-gradient(135deg, #7DD3FC, #A78BFA)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {s.n}
                </span>
              </div>
              <h3 className="text-white font-semibold text-lg sm:text-xl tracking-[-0.02em] mb-2">{s.title}</h3>
              <p className="text-white/60 text-[14px] leading-relaxed">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
