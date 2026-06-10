import { motion } from "framer-motion";
import { Receipt, FileQuestion, CalendarX, History, UserX, BookOpen } from "lucide-react";

const PROBLEMS = [
  { Icon: Receipt,      title: "Factures perdues",              body: "Reçus, devis, contrats — éparpillés dans des courriels, des photos et des papiers." },
  { Icon: FileQuestion, title: "Soumissions floues",            body: "Impossible de comparer ce qui est réellement inclus, ni de juger le prix." },
  { Icon: CalendarX,    title: "Entretien oublié",              body: "Aucun rappel, aucune trace de ce qui a déjà été fait — ni de ce qui s'en vient." },
  { Icon: History,      title: "Pas d'historique",              body: "Une décennie de rénovations qui s'efface à chaque déménagement ou revente." },
  { Icon: UserX,        title: "Entrepreneurs non imputables",  body: "Aucune trace centralisée de qui a fait quoi, avec quelle qualité." },
  { Icon: BookOpen,     title: "Aucune mémoire à long terme",   body: "Chaque décision repart de zéro. Aucune continuité d'une rénovation à l'autre." },
];

export default function SectionFragmentedProblem() {
  return (
    <section className="relative px-4 sm:px-6 py-20 sm:py-28">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.04em] text-white leading-[1.1] max-w-3xl"
        >
          La plupart des propriétaires prennent des décisions coûteuses{" "}
          <span className="text-white/50">avec de l'information fragmentée.</span>
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-10 sm:mt-14">
          {PROBLEMS.map((p, i) => {
            const Icon = p.Icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[28px] p-5 sm:p-6"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(24px)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Icon size={18} color="#7DD3FC" strokeWidth={1.8} />
                </div>
                <h3 className="text-white font-semibold text-[15px] mb-1.5">{p.title}</h3>
                <p className="text-white/55 text-[13px] leading-relaxed">{p.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
