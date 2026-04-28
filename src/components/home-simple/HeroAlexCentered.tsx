/**
 * HeroAlexCentered — Title + subtext + premium animated Alex orb (centered).
 * Uses the new <AlexOrb /> component with 13 reactive states.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useAlexVoice as useAlexVoiceOverlay } from "@/contexts/AlexVoiceContext";
import { useAlexStore } from "@/features/alex/state/alexStore";
import AlexOrb, { type AlexOrbState } from "@/components/alex/AlexOrb";

export default function HeroAlexCentered() {
  const { openAlex } = useAlexVoiceOverlay();
  const mode = useAlexStore((s) => s.mode);

  const handleOrb = () => {
    useAlexStore.getState().markUserEngaged();
    openAlex("home_hero", "user_tapped_orb");
  };

  // Map alex store mode → orb state
  const orbState: AlexOrbState = useMemo(() => {
    switch (mode) {
      case "speaking": return "speaking";
      case "listening": return "listening";
      case "thinking": return "thinking";
      default: return "idle";
    }
  }, [mode]);

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

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 120, damping: 18 }}
        className="relative mt-12 mx-auto flex flex-col items-center"
      >
        <AlexOrb
          state={orbState}
          size="hero"
          onClick={handleOrb}
          ariaLabel="Parler à Alex"
        />

        <div className="mt-8 flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/60 backdrop-blur-md border border-border/40">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
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
