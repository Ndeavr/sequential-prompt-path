/**
 * HeroSectionIntentEntry — Voice-first entry with zero search fields.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, ArrowRight, Loader2 } from "lucide-react";

interface Props {
  userName?: string | null;
  onVoice: () => void;
  onTextSubmit: (text: string) => void;
  loading?: boolean;
}

const SUGGESTIONS = [
  "Trop froid chez moi",
  "Toiture qui coule",
  "Urgence plomberie",
  "Humidité au sous-sol",
  "Rénovation cuisine",
  "Thermopompe",
];

export default function HeroSectionIntentEntry({ userName, onVoice, onTextSubmit, loading }: Props) {
  const [value, setValue] = useState("");
  const greeting = userName ? `Bonjour ${userName}.` : "Décrivez votre besoin.";

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed && !loading) {
      onTextSubmit(trimmed);
      setValue("");
    }
  };

  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center px-5 pt-16 pb-8 text-center relative">
      {/* Aura */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/6 blur-[100px]" />
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl md:text-4xl font-bold text-foreground mb-2"
      >
        {greeting}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-base text-muted-foreground mb-8"
      >
        On s'occupe du reste.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="w-full max-w-md space-y-4"
      >
        {/* Voice CTA */}
        <motion.button
          onClick={onVoice}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-5 rounded-2xl font-semibold text-lg
            bg-gradient-to-r from-primary to-accent text-primary-foreground
            flex items-center justify-center gap-3
            shadow-[0_0_30px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.4)]
            transition-shadow duration-300"
        >
          <Mic className="w-5 h-5" />
          Parler à Alex
        </motion.button>

        {/* Divider */}
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          <div className="flex-1 h-px bg-border" />
          <span>ou écrivez</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Text input */}
        <div className="relative w-full">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Ex: Trop froid, toiture qui coule…"
            disabled={loading}
            className="w-full h-14 rounded-2xl pl-5 pr-14
              bg-muted/50 border border-border/60 text-foreground
              placeholder:text-muted-foreground text-base
              focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50
              transition-all duration-200 disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2
              w-10 h-10 rounded-xl bg-primary text-primary-foreground
              flex items-center justify-center
              disabled:opacity-30 hover:bg-primary/90 active:scale-95
              transition-all duration-150"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>

      {/* Suggestion chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-8 w-full max-w-lg"
      >
        <div className="flex flex-wrap gap-2 justify-center">
          {SUGGESTIONS.map((s, i) => (
            <motion.button
              key={s}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.07 }}
              onClick={() => !loading && onTextSubmit(s)}
              disabled={loading}
              className="px-4 py-2 rounded-full text-xs font-medium
                bg-muted/60 border border-border/60 text-muted-foreground
                hover:bg-primary/15 hover:text-primary hover:border-primary/40
                transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              {s}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
