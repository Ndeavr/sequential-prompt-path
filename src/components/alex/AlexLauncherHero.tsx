/**
 * AlexLauncherHero — Premium interactive hero block for "Parlez à Alex".
 * Immediately activates on tap with orb + session start.
 */
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, Mic, MessageCircle, Zap, Shield, Calendar } from "lucide-react";
import AlexOrb from "@/components/alex/AlexOrb";

interface AlexLauncherHeroProps {
  onLaunch: () => void;
  isActivating?: boolean;
  className?: string;
}

const benefits = [
  { icon: Zap, text: "Rapide" },
  { icon: Shield, text: "Sans 3 soumissions inutiles" },
  { icon: Calendar, text: "Rendez-vous simplifié" },
];

export default function AlexLauncherHero({ onLaunch, isActivating = false, className = "" }: AlexLauncherHeroProps) {
  const [tapped, setTapped] = useState(false);

  const handleLaunch = useCallback(() => {
    setTapped(true);
    // Haptic feedback on mobile
    if (navigator.vibrate) navigator.vibrate(12);
    onLaunch();
  }, [onLaunch]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 md:p-10 ${className}`}
      style={{
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-60%] left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[100px]"
          style={{ background: "hsl(var(--primary) / 0.06)" }}
        />
        <div
          className="absolute bottom-[-30%] right-[-10%] w-[300px] h-[300px] rounded-full blur-[80px]"
          style={{ background: "hsl(var(--secondary) / 0.04)" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center gap-5">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-primary/5 border-primary/15"
        >
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            Assistant IA
          </span>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-foreground"
        >
          Parlez à Alex
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="text-sm text-muted-foreground max-w-xs leading-relaxed"
        >
          Décrivez votre projet. Je vous guide.
        </motion.p>

        {/* Orb — main CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 200, damping: 18 }}
        >
          <AlexOrb
            size="lg"
            onClick={handleLaunch}
          />
        </motion.div>

        {/* Tap hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: isActivating ? 0 : 0.6 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-muted-foreground flex items-center gap-1.5"
        >
          {isActivating ? (
            <span className="flex items-center gap-1.5">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-3 w-3" />
              </motion.div>
              Connexion…
            </span>
          ) : (
            <>
              <Mic className="h-3 w-3" /> Appuyez pour parler
              <span className="mx-1">ou</span>
              <MessageCircle className="h-3 w-3" /> écrivez
            </>
          )}
        </motion.p>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex flex-wrap justify-center gap-3 mt-1"
        >
          {benefits.map(({ icon: Icon, text }) => (
            <span
              key={text}
              className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5"
            >
              <Icon className="h-3 w-3 text-primary/70" />
              {text}
            </span>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
