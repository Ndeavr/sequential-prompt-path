/**
 * CardScoreRevealSuspense — Displayed while score is hidden, building anticipation.
 */
import { motion } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";

interface Props {
  stage: "preparing" | "speaking" | "awaiting";
}

const stageText = {
  preparing: "Alex prépare votre résultat…",
  speaking: "Alex analyse votre présence…",
  awaiting: "Voici ce que votre présence actuelle révèle",
};

export default function CardScoreRevealSuspense({ stage }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-primary/20 bg-card p-6 text-center space-y-4"
    >
      <motion.div
        className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {stage === "preparing" ? (
          <Brain className="w-8 h-8 text-primary" />
        ) : (
          <Sparkles className="w-8 h-8 text-primary" />
        )}
      </motion.div>

      <div>
        <p className="text-sm font-semibold text-foreground">{stageText[stage]}</p>
        <p className="text-xs text-muted-foreground mt-1">Analyse terminée</p>
      </div>

      <div className="flex justify-center gap-1">
        {[0, 0.2, 0.4].map((delay) => (
          <motion.div
            key={delay}
            className="w-2 h-2 rounded-full bg-primary/50"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay }}
          />
        ))}
      </div>
    </motion.div>
  );
}
