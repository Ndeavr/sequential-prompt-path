/**
 * BadgeImportStageLive — Shows current import stage.
 */
import { motion } from "framer-motion";
import type { AnimationStage } from "@/hooks/useTerminalImportAnimation";

const stageLabels: Record<string, string> = {
  idle: "En attente",
  booting: "Initialisation",
  identity: "Identité",
  photos: "Photos",
  reputation: "Réputation",
  verification: "Vérification",
  aipp_score: "Score AIPP",
  plan_recommendation: "Plan recommandé",
  completed: "Terminé",
};

interface Props {
  stage: AnimationStage;
  elapsedMs: number;
}

export default function BadgeImportStageLive({ stage, elapsedMs }: Props) {
  const isActive = stage !== "idle" && stage !== "completed";
  return (
    <div className="flex items-center justify-between text-[10px] font-mono px-1">
      <motion.div
        key={stage}
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2"
      >
        {isActive && (
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
        {stage === "completed" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        <span className={isActive ? "text-emerald-400 uppercase tracking-wider" : "text-emerald-600 uppercase tracking-wider"}>
          {stageLabels[stage] || stage}
        </span>
      </motion.div>
      <span className="text-emerald-700/60 tabular-nums">{(elapsedMs / 1000).toFixed(1)}s</span>
    </div>
  );
}
