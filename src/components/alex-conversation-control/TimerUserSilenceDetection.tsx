/**
 * TimerUserSilenceDetection — Visual micro-indicator for silence state.
 */
import { motion } from "framer-motion";
import type { ConversationStatus } from "@/hooks/useAlexConversationControl";

interface Props {
  status: ConversationStatus;
  silenceCount: number;
}

export default function TimerUserSilenceDetection({ status, silenceCount }: Props) {
  if (status === "active" || status === "closed") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20"
    >
      <motion.div
        className="w-2 h-2 rounded-full bg-amber-400"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <span className="text-[11px] text-amber-400/80">
        {status === "idle" && silenceCount <= 1 && "En attente…"}
        {status === "closing" && "Fermeture imminente…"}
      </span>
    </motion.div>
  );
}
