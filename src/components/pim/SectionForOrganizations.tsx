import { motion } from "framer-motion";
import { Building2, Landmark, ShieldCheck, Banknote } from "lucide-react";

const CAPABILITIES = [
  "Suivi de subventions et performance des programmes",
  "Vérification des résultats de rénovations énergétiques",
  "Mesure de l'efficacité énergétique réelle vs. déclarée",
  "Imputabilité et performance des entrepreneurs",
  "Analytics du parc résidentiel sur le territoire",
];

const VERTICALS = [
  { Icon: Landmark,    label: "Municipalités" },
  { Icon: Building2,   label: "Services publics" },
  { Icon: ShieldCheck, label: "Assureurs" },
  { Icon: Banknote,    label: "Institutions financières" },
];

export default function SectionForOrganizations() {
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
          <span className="inline-block text-[11px] tracking-[0.18em] uppercase text-amber-300/70 mb-4">
            Pour les organisations
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.04em] text-white leading-[1.1]">
            Quand des millions de propriétés ont une mémoire,{" "}
            <span className="text-white/50">le secteur résidentiel devient lisible.</span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 mt-12 sm:mt-14">
          <div
            className="rounded-[28px] p-7 sm:p-8"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(24px)",
            }}
          >
            <h3 className="text-white font-semibold text-lg mb-5">Capacités institutionnelles</h3>
            <ul className="space-y-3">
              {CAPABILITIES.map((c, i) => (
                <motion.li
                  key={c}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="flex items-start gap-3 text-white/70 text-[14px] leading-relaxed"
                >
                  <span
                    className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "linear-gradient(135deg, #7DD3FC, #A78BFA)" }}
                  />
                  <span>{c}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-[28px] p-7 sm:p-8"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(24px)",
            }}
          >
            <h3 className="text-white font-semibold text-lg mb-5">Verticals pertinents</h3>
            <div className="grid grid-cols-2 gap-3">
              {VERTICALS.map((v) => {
                const Icon = v.Icon;
                return (
                  <div
                    key={v.label}
                    className="rounded-2xl p-4 flex flex-col items-start gap-2.5"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <Icon size={16} color="#FCD34D" strokeWidth={1.8} />
                    </div>
                    <span className="text-white/75 text-[13px] font-medium">{v.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-white/45 text-[12px] leading-relaxed">
              Exemples génériques — PIM est conçu pour s'intégrer aux infrastructures institutionnelles du logement.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
