/**
 * TimerAlexUserPresence — Visual indicator for silence/idle/paused state.
 * Minimal, non-intrusive, premium.
 */
import { motion, AnimatePresence } from "framer-motion";
import type { AlexSilenceStatus } from "@/hooks/useAlexSilenceControl";

interface Props {
  status: AlexSilenceStatus;
}

export default function TimerAlexUserPresence({ status }: Props) {
  if (status === "active" || status === "resuming") return null;

  const labels: Record<string, string> = {
    awaiting_user: "En attente…",
    idle_prompted: "Êtes-vous là ?",
    pausing: "Fermeture…",
    paused: "En pause",
  };

  const colors: Record<string, string> = {
    awaiting_user: "bg-amber-400",
    idle_prompted: "bg-amber-400",
    pausing: "bg-orange-400",
    paused: "bg-muted-foreground/50",
  };

  return (
    <AnimatePresence>
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 border border-border/50 backdrop-blur-sm"
      >
        <motion.div
          className={`w-2 h-2 rounded-full ${colors[status] || "bg-muted-foreground"}`}
          animate={status !== "paused" ? { opacity: [1, 0.3, 1] } : {}}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span className="text-[11px] text-muted-foreground">
          {labels[status] || ""}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
