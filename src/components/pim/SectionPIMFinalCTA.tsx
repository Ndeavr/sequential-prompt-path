import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mic } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

interface Props {
  onCreate?: () => void;
}

export default function SectionPIMFinalCTA({ onCreate }: Props) {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();

  return (
    <section className="relative px-4 sm:px-6 py-24 sm:py-32">
      <div className="max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.04em] text-white leading-[1.05]"
        >
          Commencez à bâtir{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #7DD3FC, #A78BFA)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            la mémoire de votre maison.
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-5 text-white/60 text-base sm:text-lg leading-relaxed"
        >
          Gratuit. Moins de 30 secondes. Aucun engagement.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <button
            onClick={() => (onCreate ? onCreate() : navigate("/onboarding"))}
            className="h-14 px-8 rounded-[18px] text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-transform duration-[420ms] hover:-translate-y-0.5"
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
            onClick={() => openAlex("pim_landing")}
            className="h-14 px-7 rounded-[18px] text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-transform duration-[420ms] hover:-translate-y-0.5"
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

        <p className="mt-6 text-white/35 text-[12px]">
          Français — fr-CA · Conçu au Québec
        </p>
      </div>
    </section>
  );
}
