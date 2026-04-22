/**
 * Alex 100M — Panel V6
 * Thread + input + uploads + quick actions. Never blank.
 * Single CTA for audio unlock. No duplicate "touch to talk" prompts.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useAlexStore } from "./state/alexStore";
import { selectModeLabel } from "./state/alexSelectors";
import { AlexMessageList } from "./AlexMessageList";
import { AlexInput } from "./AlexInput";
import { AlexQuickActions } from "./AlexQuickActions";
import { AlexUploadDropzone } from "./AlexUploadDropzone";
import { useAlexUIBridge } from "./hooks/useAlexUIBridge";
import { getMinimizeCta, getFallbackText } from "./utils/alexCopy";

export function AlexPanel() {
  const mode = useAlexStore((s) => s.mode);
  const lang = useAlexStore((s) => s.activeLanguage);
  const softPromptText = useAlexStore((s) => s.softPromptText);
  const modeLabel = useAlexStore(selectModeLabel);
  const isMinimized = mode === "minimized";

  const { onTextSubmit, onQuickAction, onFileUpload, onMinimize, onDismissSoftPrompt } = useAlexUIBridge();

  if (isMinimized) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col w-full max-w-md h-[520px] bg-card/90 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">{modeLabel}</span>
        </div>
        <button
          onClick={onMinimize}
          className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          {getMinimizeCta(lang)}
        </button>
      </div>

      {/* Voice fallback notice — only for permanent fallback, not audio unlock */}
      {mode === "fallback_text" && (
        <div className="px-4 py-2 text-[11px] text-warning/80 bg-warning/5 border-b border-warning/10">
          {getFallbackText(lang)}
        </div>
      )}

      {/* Messages */}
      <AlexMessageList />

      {/* Soft prompt overlay */}
      <AnimatePresence>
        {softPromptText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-primary/5 border-t border-primary/10 cursor-pointer"
            onClick={onDismissSoftPrompt}
          >
            <p className="text-xs text-primary/70 italic">{softPromptText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions */}
      <AlexQuickActions onSelect={onQuickAction} />

      {/* Upload */}
      <AlexUploadDropzone onUpload={onFileUpload} />

      {/* Input — always available */}
      <AlexInput onSend={onTextSubmit} />
    </motion.div>
  );
}
