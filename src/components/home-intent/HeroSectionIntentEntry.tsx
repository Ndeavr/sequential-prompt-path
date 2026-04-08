/**
 * HeroSectionIntentEntry — Simplified hero with voice/text entry points.
 */
import { motion } from "framer-motion";
import CardEntryVoicePrimary from "./CardEntryVoicePrimary";
import CardEntryTextSecondary from "./CardEntryTextSecondary";
import ChipsIntentSuggestionsDynamic from "./ChipsIntentSuggestionsDynamic";

interface Props {
  userName?: string | null;
  onVoice: () => void;
  onTextSubmit: (text: string) => void;
}

export default function HeroSectionIntentEntry({ userName, onVoice, onTextSubmit }: Props) {
  const greeting = userName ? `Bonjour ${userName}.` : "Décrivez votre besoin.";
  const sub = userName ? "Qu'est-ce qu'on fait aujourd'hui?" : "On s'occupe du reste.";

  return (
    <section className="min-h-[70vh] flex flex-col items-center justify-center px-5 pt-16 pb-8 text-center">
      {/* Aura background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/6 blur-[100px]" />
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-hero-sm md:text-hero font-display text-foreground mb-2"
      >
        {greeting}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-body-lg text-muted-foreground mb-8"
      >
        {sub}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="w-full max-w-md space-y-4"
      >
        <CardEntryVoicePrimary onClick={onVoice} />

        <div className="flex items-center gap-3 text-muted-foreground text-caption">
          <div className="flex-1 h-px bg-border" />
          <span>ou écrivez</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <CardEntryTextSecondary onSubmit={onTextSubmit} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-8 w-full max-w-lg"
      >
        <ChipsIntentSuggestionsDynamic onSelect={onTextSubmit} />
      </motion.div>
    </section>
  );
}
