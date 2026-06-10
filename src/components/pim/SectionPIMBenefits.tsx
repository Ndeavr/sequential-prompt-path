/**
 * SectionPIMBenefits — 4 bénéfices humains du Passeport Maison.
 * Mémoire → Historique → Valeur → Organisation. Zéro mention d'IA.
 */
import { motion } from "framer-motion";
import { BookOpen, History, ShieldCheck, FolderArchive } from "lucide-react";

const BENEFITS = [
  {
    Icon: BookOpen,
    title: "Mémoire permanente",
    body: "Retrouvez rapidement factures, garanties, inspections et rénovations.",
  },
  {
    Icon: History,
    title: "Historique complet",
    body: "Conservez tout ce qui concerne votre propriété dans un seul endroit.",
  },
  {
    Icon: ShieldCheck,
    title: "Valeur protégée",
    body: "Facilitez les ventes, refinancements et réclamations futures.",
  },
  {
    Icon: FolderArchive,
    title: "Documents organisés",
    body: "Plus besoin de chercher dans vos courriels ou vos classeurs.",
  },
];

export default function SectionPIMBenefits() {
  return (
    <section className="relative px-4 sm:px-6 py-16 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-10 sm:mb-14"
        >
          <span className="inline-block text-[11px] tracking-[0.18em] uppercase text-cyan-300/80 mb-4">
            Ce que vous y gagnez
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.04em] text-white leading-[1.1]">
            La tranquillité d'esprit{" "}
            <span className="text-white/50">au fil des années.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {BENEFITS.map((b, i) => {
            const Icon = b.Icon;
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[28px] p-6 sm:p-7 transition-transform duration-[420ms]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(24px)",
                }}
                whileHover={{ y: -2 }}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(125,211,252,0.15), rgba(167,139,250,0.15))",
                    border: "1px solid rgba(125,211,252,0.25)",
                  }}
                >
                  <Icon size={20} color="#A5F3FC" strokeWidth={1.8} />
                </div>
                <h3 className="text-white font-semibold text-[16px] mb-2 tracking-[-0.01em]">
                  {b.title}
                </h3>
                <p className="text-white/60 text-[14px] leading-relaxed">{b.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
