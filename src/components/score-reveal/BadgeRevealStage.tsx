/**
 * BadgeRevealStage — Shows current reveal stage.
 */
import { motion } from "framer-motion";

type Stage = "preparing" | "speaking" | "revealing" | "revealed" | "interpreting" | "complete";

const stageLabels: Record<Stage, string> = {
  preparing: "Préparation",
  speaking: "Alex parle",
  revealing: "Dévoilement",
  revealed: "Score dévoilé",
  interpreting: "Interprétation",
  complete: "Terminé",
};

export default function BadgeRevealStage({ stage }: { stage: Stage }) {
  return (
    <motion.div
      key={stage}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1"
    >
      {stage !== "complete" && stage !== "revealed" && (
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-primary"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
        {stageLabels[stage]}
      </span>
    </motion.div>
  );
}
