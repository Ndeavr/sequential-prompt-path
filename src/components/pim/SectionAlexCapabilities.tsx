import { motion } from "framer-motion";
import { FileSearch, AlertCircle, FolderTree, Calculator, ShieldAlert, Sparkles } from "lucide-react";

const ALEX_HELPS = [
  { Icon: FileSearch,  title: "Analyse vos soumissions",   body: "Ligne par ligne. Identifie ce qui manque, ce qui est gonflé, ce qui ne tient pas." },
  { Icon: AlertCircle, title: "Comprend les risques",      body: "Lit votre historique et vous prévient avant que ça coûte cher." },
  { Icon: FolderTree,  title: "Organise vos documents",    body: "Tout est classé, daté, contextualisé — accessible quand vous en avez besoin." },
  { Icon: Calculator,  title: "Estime vos projets",        body: "Coûts ancrés sur votre propriété, votre ville et votre situation réelle." },
  { Icon: ShieldAlert, title: "Détecte les signaux",       body: "Humidité, infiltration, vieillissement — l'IA les voit avant qu'ils s'aggravent." },
  { Icon: Sparkles,    title: "Simplifie les décisions",   body: "Vous restez en contrôle. Alex enlève le bruit." },
];

export default function SectionAlexCapabilities() {
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
            Alex × PIM
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.04em] text-white leading-[1.1]">
            Alex lit votre PIM{" "}
            <span className="text-white/50">et travaille pour vous.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-10 sm:mt-14">
          {ALEX_HELPS.map((h, i) => {
            const Icon = h.Icon;
            return (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="rounded-[28px] p-5 sm:p-6 transition-transform duration-[420ms]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(24px)",
                }}
                whileHover={{ y: -2 }}
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(125,211,252,0.15), rgba(167,139,250,0.15))",
                    border: "1px solid rgba(125,211,252,0.25)",
                  }}
                >
                  <Icon size={18} color="#A5F3FC" strokeWidth={1.8} />
                </div>
                <h3 className="text-white font-semibold text-[15px] mb-1.5">{h.title}</h3>
                <p className="text-white/55 text-[13px] leading-relaxed">{h.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
