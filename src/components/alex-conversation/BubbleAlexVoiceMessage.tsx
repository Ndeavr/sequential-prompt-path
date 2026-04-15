/**
 * BubbleAlexVoiceMessage — Premium Alex bubble with voice playback indicator.
 * Glow effect, audio wave, progressive reveal.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Volume2, VolumeX } from "lucide-react";

interface Props {
  content: string;
  hasVoice?: boolean;
  isPlaying?: boolean;
  onToggleVoice?: () => void;
  delay?: number;
}

export default function BubbleAlexVoiceMessage({ content, hasVoice, isPlaying, onToggleVoice, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94], delay }}
      className="flex gap-2.5 items-start max-w-[88%]"
    >
      {/* Alex avatar */}
      <div className="flex-shrink-0 relative">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center border border-primary/20"
          style={{
            background: "radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.25), hsl(262 80% 50% / 0.08))",
          }}
        >
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
        {isPlaying && (
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-background"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>

      {/* Message bubble */}
      <div className="relative group">
        <div
          className="rounded-2xl rounded-tl-md px-4 py-3 border border-border/30"
          style={{
            background: "linear-gradient(135deg, hsl(var(--muted) / 0.7), hsl(var(--muted) / 0.4))",
            backdropFilter: "blur(12px)",
          }}
        >
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>

          {/* Voice playback indicator */}
          {hasVoice && (
            <button
              onClick={onToggleVoice}
              className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              {isPlaying ? (
                <>
                  <VolumeX className="w-3 h-3" />
                  <span>Arrêter</span>
                  {/* Audio wave */}
                  <div className="flex gap-[2px] items-end ml-1 h-3">
                    {[0, 1, 2, 3, 4].map(i => (
                      <motion.div
                        key={i}
                        className="w-[2px] bg-primary/70 rounded-full"
                        animate={{ height: ["3px", "10px", "5px", "8px", "3px"] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3" />
                  <span>Écouter</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Subtle glow behind bubble */}
        <div
          className="absolute inset-0 -z-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.06), transparent 70%)",
            filter: "blur(16px)",
            transform: "scale(1.1)",
          }}
        />
      </div>
    </motion.div>
  );
}
