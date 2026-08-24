/**
 * HeroHomeownerLight — Homeowner-first hero on the light UNPRO surface.
 * White / light-blue background, navy typography, royal-blue actions.
 * Alex is integrated as the primary entry point (orb + CTA).
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAlexStore } from "@/features/alex/state/alexStore";
import AlexOrb, { type AlexOrbState } from "@/components/alex/AlexOrb";

export default function HeroHomeownerLight() {
  const { openAlex } = useAlexVoice();
  const mode = useAlexStore((s) => s.mode);

  const orbState: AlexOrbState = useMemo(() => {
    switch (mode) {
      case "speaking": return "speaking";
      case "listening": return "listening";
      case "thinking": return "thinking";
      default: return "idle";
    }
  }, [mode]);

  const startAlex = () => {
    useAlexStore.getState().markUserEngaged();
    openAlex("home_hero", "user_tapped_orb");
  };

  return (
    <section className="relative overflow-hidden">
      {/* Soft light-blue atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(900px 520px at 82% -12%, hsl(var(--primary) / 0.12), transparent 62%), radial-gradient(760px 460px at -8% 12%, hsl(205 92% 62% / 0.10), transparent 66%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pt-14 pb-16 md:pt-24 md:pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-secondary-foreground"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Plateforme d'intelligence résidentielle québécoise
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mt-6 text-[clamp(2rem,6.2vw,3.6rem)] font-semibold leading-[1.06] tracking-[-0.03em] text-foreground"
        >
          La fin des 3 soumissions.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="mx-auto mt-5 max-w-2xl text-[16.5px] leading-relaxed text-muted-foreground md:text-lg"
        >
          Décrivez vos travaux à Alex. Une question à la fois. Vous repartez avec
          une compréhension claire de votre projet et un entrepreneur qui
          correspond réellement à vos besoins.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.18, type: "spring", stiffness: 110, damping: 18 }}
          className="mt-10 flex justify-center"
        >
          <AlexOrb state={orbState} size="hero" theme="light" onClick={startAlex} ariaLabel="Parler à Alex" />
        </motion.div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={startAlex}
            className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            Parler à Alex
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            to="/diagnostic"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-card px-7 py-4 text-[15px] font-semibold text-foreground transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            Décrire mes travaux
          </Link>
        </div>

        <p className="mt-5 text-[13px] text-muted-foreground">
          Gratuit pour les propriétaires. Aucune obligation.
        </p>
      </div>
    </section>
  );
}
