/**
 * PlayerVoiceResponse — Premium voice playback with orb animation.
 */
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

interface Props {
  isPlaying: boolean;
  onToggle: () => void;
  language: "fr" | "en";
}

export default function PlayerVoiceResponse({ isPlaying, onToggle, language }: Props) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/40 bg-muted/30 backdrop-blur-sm hover:bg-muted/50 transition-all"
      aria-label={isPlaying ? "Arrêter la voix" : "Écouter"}
    >
      {isPlaying ? (
        <>
          <VolumeX className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">
            {language === "fr" ? "Arrêter" : "Stop"}
          </span>
          <div className="flex gap-[2px] items-end h-3">
            {[0, 1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="w-[2px] bg-primary/70 rounded-full"
                animate={{ height: ["3px", "10px", "4px", "8px", "3px"] }}
                transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.08 }}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {language === "fr" ? "Écouter" : "Listen"}
          </span>
        </>
      )}
    </button>
  );
}
