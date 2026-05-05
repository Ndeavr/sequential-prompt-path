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
import AlexTradesAura from "./AlexTradesAura";

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
    <section
      className="relative isolate -mx-[calc(50vw-50%)] w-screen text-center overflow-hidden flex flex-col items-center justify-between"
      style={{ minHeight: "calc(100svh - 56px)" }}
    >
      {/* Fullscreen rotating trade background */}
      <AlexTradesAura variant="section" />

      {/* Top: Title + subtext */}
      <div className="relative z-20 px-5 pt-8 w-full max-w-2xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[clamp(1.9rem,6vw,3rem)] font-display font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]"
        >
          Décrivez votre problème<br />ou imaginez votre projet
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4 }}
          className="mt-4 text-base md:text-lg text-white/85 max-w-md mx-auto drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]"
        >
          Alex vous aide à estimer, comprendre, comparer et trouver le bon pro.
        </motion.p>
      </div>

      {/* Center: Orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 120, damping: 18 }}
        className="relative z-20 flex items-center justify-center my-4"
      >
        <AlexOrb
          state={orbState}
          size="hero"
          onClick={handleOrb}
          ariaLabel="Parler à Alex"
        />
      </motion.div>

      {/* Bottom: Badge + CTA */}
      <div className="relative z-20 flex flex-col items-center pb-24 px-5">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-sm font-medium text-white">Alex</span>
          <span className="text-sm text-white/70">· Votre expert IA</span>
        </div>

        <button
          onClick={handleOrb}
          className="mt-3 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
        >
          <Mic className="w-4 h-4" />
          Cliquez pour parler à Alex
        </button>
      </div>
    </section>
  );
}
