/**
 * HeroSectionIntentTrigger — Reusable hero with title, CTA, and Alex entry.
 */
import { motion } from "framer-motion";
import { Mic, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  ctaPrimary: { label: string; onClick: () => void };
  ctaSecondary?: { label: string; onClick: () => void };
  className?: string;
}

export default function HeroSectionIntentTrigger({ title, subtitle, ctaPrimary, ctaSecondary, className }: Props) {
  const { openAlex } = useAlexVoice();

  return (
    <section className={cn("relative px-5 pt-20 pb-10 text-center", className)}>
      {/* Aura */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-foreground max-w-xl mx-auto leading-tight"
      >
        {title}
      </motion.h1>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto"
        >
          {subtitle}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
      >
        <Button size="lg" onClick={ctaPrimary.onClick} className="min-w-[200px] gap-2">
          <Send className="w-4 h-4" />
          {ctaPrimary.label}
        </Button>
        {ctaSecondary && (
          <Button size="lg" variant="outline" onClick={ctaSecondary.onClick} className="min-w-[200px] gap-2">
            {ctaSecondary.label}
          </Button>
        )}
      </motion.div>

      {/* Alex mini entry */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 flex items-center justify-center gap-4"
      >
        <button
          onClick={() => openAlex("home_intent")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Mic className="w-4 h-4" />
          Parler à Alex
        </button>
        <span className="text-border">|</span>
        <button
          onClick={() => openAlex("home_intent")}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Écrire à Alex
        </button>
      </motion.div>
    </section>
  );
}
