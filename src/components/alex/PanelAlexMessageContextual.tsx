/**
 * PanelAlexMessageContextual — Contextual Alex message panel.
 * Shows greeting, single question, quick replies, and suggested next actions.
 * Animated, mobile-first, premium feel.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Camera, ArrowRight } from "lucide-react";
import type { AlexContextPrompt } from "@/services/alexContextPromptEngine";
import unproRobot from "@/assets/unpro-robot.png";

interface PanelAlexMessageContextualProps {
  prompt: AlexContextPrompt;
  isAnalyzing?: boolean;
  onQuickReply: (reply: string) => void;
  onDismiss: () => void;
  onUploadPhoto?: () => void;
  className?: string;
}

export default function PanelAlexMessageContextual({
  prompt,
  isAnalyzing = false,
  onQuickReply,
  onDismiss,
  onUploadPhoto,
  className = "",
}: PanelAlexMessageContextualProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-card rounded-3xl p-5 shadow-xl relative overflow-hidden ${className}`}
    >
      {/* Close button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <AnimatePresence mode="wait">
        {isAnalyzing ? (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 py-2"
          >
            <div className="relative shrink-0">
              <img src={unproRobot} alt="Alex" className="h-10 w-10 rounded-full object-cover" />
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary border-2 border-background"
              />
            </div>
            <div className="space-y-1">
              <motion.div className="flex items-center gap-1.5">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent"
                />
                <span className="text-sm font-medium text-foreground">J'analyse votre image…</span>
              </motion.div>
              <p className="text-xs text-muted-foreground">Détection en cours</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Alex avatar + greeting */}
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <img src={unproRobot} alt="Alex" className="h-10 w-10 rounded-full object-cover" />
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success border-2 border-background" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                {/* Greeting */}
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-2xl rounded-tl-md px-4 py-2.5 bg-muted/50 border border-border/40"
                >
                  <p className="text-sm font-medium text-foreground">{prompt.greetingText}</p>
                </motion.div>

                {/* Primary question */}
                {prompt.primaryQuestion && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="rounded-2xl rounded-tl-md px-4 py-2.5 bg-primary/5 border border-primary/20"
                  >
                    <p className="text-sm font-medium text-foreground">{prompt.primaryQuestion}</p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Quick replies */}
            {prompt.quickReplies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap gap-2 pl-[52px]"
              >
                {prompt.quickReplies.map((reply, i) => (
                  <motion.button
                    key={reply}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + i * 0.08 }}
                    onClick={() => onQuickReply(reply)}
                    className="text-xs font-semibold px-3.5 py-2 rounded-full border border-border/60 bg-card/80 text-foreground hover:bg-primary/5 hover:border-primary/30 transition-all active:scale-95"
                  >
                    {reply}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Upload photo CTA if relevant */}
            {onUploadPhoto && prompt.quickReplies.some((r) => r.toLowerCase().includes("photo")) && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={onUploadPhoto}
                className="ml-[52px] flex items-center gap-2 text-xs font-medium text-primary hover:underline"
              >
                <Camera className="h-3.5 w-3.5" />
                Téléverser une photo
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
