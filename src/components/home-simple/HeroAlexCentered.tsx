/**
 * HeroAlexCentered — Title + subtext + large pulsating Alex orb (centered).
 * Tap orb → unlock audio + start voice mode.
 */
import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { AlexOrb } from "@/features/alex/AlexOrb";
import { useAlexVoice } from "@/features/alex/hooks/useAlexVoice";
import { useAlexStore } from "@/features/alex/state/alexStore";

export default function HeroAlexCentered() {
  const { unlockAudio } = useAlexVoice();
  const mode = useAlexStore((s) => s.mode);

  const handleOrb = () => {
    useAlexStore.getState().markUserEngaged();
    unlockAudio();
  };

  const isLive = mode === "speaking" || mode === "listening" || mode === "thinking";

  return (
    <section className="relative px-5 pt-10 pb-6 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-[clamp(1.9rem,6vw,3rem)] font-display font-bold leading-[1.05] tracking-tight text-foreground"
      >
        Décrivez votre problème<br />ou imaginez votre projet
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.4 }}
        className="mt-4 text-base md:text-lg text-muted-foreground max-w-md mx-auto"
      >
        Alex vous aide à estimer, comprendre, comparer et trouver le bon pro.
      </motion.p>

      {/* Large orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
        className="relative mt-10 mx-auto flex flex-col items-center"
      >
        {/* Outer glow */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        </div>

        <div className="scale-[2.2] origin-center">
          <AlexOrb onTap={handleOrb} size="lg" />
        </div>

        <div className="mt-12 flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/70 backdrop-blur-md border border-border/40">
          <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-500" : "bg-emerald-500/70"} animate-pulse`} />
          <span className="text-sm font-medium text-foreground">Alex</span>
          <span className="text-sm text-muted-foreground">· Votre expert IA</span>
        </div>

        <button
          onClick={handleOrb}
          className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Mic className="w-4 h-4" />
          Cliquez pour parler à Alex
        </button>
      </motion.div>
    </section>
  );
}
