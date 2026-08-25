/**
 * HeroHomeownerLight — Homeowner-first hero on the light UNPRO surface.
 * White / light-blue background, navy typography, royal-blue actions.
 * Headline: « Fini les 3 soumissions. Un pro. C'est tout. »
 * Alex orb + CTA, homeowner photographic visual.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAlexStore } from "@/features/alex/state/alexStore";
import AlexOrb, { type AlexOrbState } from "@/components/alex/AlexOrb";
import heroImage from "@/assets/home-hero-homeowner.jpg";

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

      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pt-12 pb-14 md:pt-20 md:pb-20 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(2.1rem,6.4vw,3.8rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground"
        >
          Fini les 3 soumissions.
          <span className="block text-primary">Un pro. C'est tout.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mx-auto mt-5 max-w-2xl text-[16.5px] leading-relaxed text-muted-foreground md:text-lg"
        >
          Décrivez vos travaux à Alex, une question à la fois. L'IA comprend
          votre projet et vous oriente vers l'entrepreneur qui correspond
          réellement à vos besoins.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.16, type: "spring", stiffness: 110, damping: 18 }}
          className="mt-9 flex justify-center"
        >
          <AlexOrb state={orbState} size="hero" theme="light" onClick={startAlex} ariaLabel="Parler à Alex" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <button
            data-cta-canonical="home_alex"
            onClick={startAlex}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            Parler à Alex
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        <p className="mt-4 text-[13px] text-muted-foreground">
          Gratuit pour les propriétaires. Aucune obligation.
        </p>

        {/* Homeowner visual */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-[28px] border border-border shadow-xl shadow-primary/10"
        >
          <img
            src={heroImage}
            alt="Propriétaires québécois devant leur maison, confiants après avoir trouvé le bon entrepreneur avec UNPRO"
            width={1536}
            height={1024}
            className="h-auto w-full object-cover"
            fetchPriority="high"
          />
        </motion.div>
      </div>
    </section>
  );
}
