import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mic } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import PropertyIntelligenceGraph from "./PropertyIntelligenceGraph";
import IntelligenceBackground from "@/components/visual/intelligence-bg/IntelligenceBackground";

export default function HeroSectionPIMLanding() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();

  return (
    <section className="relative min-h-[88vh] flex items-center px-4 sm:px-6 pt-12 pb-16 overflow-hidden">
      {/* Intelligence background — Passport variant (archive drift) */}
      <IntelligenceBackground variant="passport" />


      <div className="relative max-w-6xl mx-auto w-full grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-[0.12em] uppercase mb-6"
            style={{
              background: "rgba(125,211,252,0.08)",
              border: "1px solid rgba(125,211,252,0.20)",
              color: "#7DD3FC",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
            PIM · Le carnet de vie de votre maison
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-bold tracking-[-0.04em] text-white leading-[1.02]"
          >
            Votre maison possède désormais sa propre{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #7DD3FC, #A78BFA)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              mémoire.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 text-base sm:text-lg text-white/65 leading-relaxed max-w-xl"
          >
            Chaque intervention, document et décision importante est conservé
            automatiquement dans un dossier unique qui évolue avec votre propriété —
            rénovations, garanties, inspections, factures et équipements, réunis pour
            aujourd'hui et pour les années à venir.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-3"
          >
            <button
              onClick={() => navigate("/onboarding")}
              className="h-14 px-7 rounded-[18px] text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-transform duration-[420ms] hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #38BDF8, #6366F1)",
                color: "white",
                boxShadow: "0 12px 36px -10px rgba(56,189,248,0.6)",
              }}
            >
              Créer mon Passeport Maison
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => openAlex("pim_hero")}
              className="h-14 px-6 rounded-[18px] text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-transform duration-[420ms] hover:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white",
                backdropFilter: "blur(24px)",
              }}
            >
              <Mic size={18} />
              Parler à Alex
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-white/45"
          >
            <span>✓ Gratuit · 30 secondes</span>
            <span>✓ Aucun engagement</span>
            <span>✓ Conçu au Québec</span>
          </motion.div>
        </div>

        {/* Graphe mémoire */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="flex items-center justify-center"
        >
          <PropertyIntelligenceGraph variant="hero" />
        </motion.div>
      </div>
    </section>
  );
}
