/**
 * ButtonAlexMuteToggle — Mute/unmute Alex voice output.
 */
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  isMuted: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function ButtonAlexMuteToggle({ isMuted, onToggle, disabled }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onToggle}
      disabled={disabled}
      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
        isMuted
          ? "bg-muted/60 text-muted-foreground"
          : "bg-primary/10 text-primary"
      } disabled:opacity-30`}
      aria-label={isMuted ? "Activer la voix d'Alex" : "Couper la voix d'Alex"}
      title={isMuted ? "Réactiver la voix" : "Couper la voix"}
    >
      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </motion.button>
  );
}
