
import { motion } from "framer-motion";
import { Shield, Sparkles } from "lucide-react";
import type { FounderPlan } from "@/hooks/useFounderPlans";
import CounterLiveSpots from "./CounterLiveSpots";
import BadgeFounderLimited from "./BadgeFounderLimited";

interface Props {
  elite?: FounderPlan;
  signature?: FounderPlan;
  isLoading: boolean;
}

export default function HeroSectionFounderScarcity({ elite, signature, isLoading }: Props) {
  const totalRemaining = (elite?.spots_remaining ?? 30) + (signature?.spots_remaining ?? 30);

  return (
    <section className="relative overflow-hidden pt-16 pb-20 px-4">
      {/* Aura glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[200px] bg-accent/5 rounded-full blur-[80px]" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <BadgeFounderLimited remaining={Math.min(elite?.spots_remaining ?? 30, signature?.spots_remaining ?? 30)} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight"
        >
          Plans Fondateurs UNPRO
          <br />
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Accès verrouillé pour 10 ans
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-muted-foreground max-w-xl mx-auto"
        >
          30 entreprises. Pas une de plus.
          <br />
          Paiement unique. Territoire exclusif. Priorité IA absolue.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          {isLoading ? (
            <div className="h-12 w-48 rounded-full bg-muted/20 animate-pulse" />
          ) : (
            <CounterLiveSpots remaining={totalRemaining} total={60} label="Places fondateurs totales" />
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-6 text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-primary" /> Paiement unique</span>
          <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-accent" /> 10 ans d'avantage</span>
        </motion.div>
      </div>
    </section>
  );
}
