/**
 * HeroIntelligence — Premium hero with headline + Alex orb invitation.
 * Auto-greets Alex once per tab session after 2.5s (event-driven, never retries).
 */
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { hasGreeted, markGreeted } from "@/lib/alexSessionState";
import { useAuth } from "@/hooks/useAuth";

const GREET_DELAY_MS = 2500;

export default function HeroIntelligence() {
  const { openAlex } = useAlexVoice();
  const { session } = useAuth();
  const firstName = (session?.user?.user_metadata as any)?.first_name as string | undefined;

  useEffect(() => {
    if (hasGreeted()) return;
    const t = window.setTimeout(() => {
      if (hasGreeted()) return;
      markGreeted();
      const hint = firstName
        ? `Bonjour ${firstName}. Quel problème puis-je vous aider à régler aujourd'hui?`
        : undefined;
      openAlex("homeowner-intel", hint);
    }, GREET_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [openAlex, firstName]);

  return (
    <section className="relative px-5 lg:px-10 pt-16 lg:pt-24 pb-8 lg:pb-14">
      {/* Soft halo behind hero */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[120vw] max-w-[900px] h-[400px]
        rounded-full blur-[120px] bg-sky-500/10 pointer-events-none -z-10" />

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-[clamp(2rem,7vw,3.5rem)] leading-[1.05] tracking-[-0.04em] font-semibold text-white max-w-[18ch]"
      >
        Votre maison. <br className="hidden sm:block" />
        Enfin comprise par l'IA.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 text-white/60 text-[15px] lg:text-lg max-w-[42ch] leading-relaxed"
      >
        Décrivez un problème, importez une photo ou analysez une soumission en quelques secondes.
      </motion.p>
    </section>
  );
}
