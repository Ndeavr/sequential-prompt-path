/**
 * PanelInputModeSelector — Visible options to switch between modes.
 * 🎙 Parler à Alex (prioritaire) | 💬 Écrire | ✍️ Remplir manuellement
 */
import { motion } from "framer-motion";
import { Mic, MessageSquare, PenLine } from "lucide-react";
import type { InputMode } from "@/hooks/useInputModeDetection";

const MODES: { mode: InputMode; label: string; icon: typeof Mic; desc: string }[] = [
  { mode: "voice", label: "Parler à Alex", icon: Mic, desc: "Le plus rapide" },
  { mode: "chat", label: "Écrire", icon: MessageSquare, desc: "Par messages" },
  { mode: "form", label: "Remplir manuellement", icon: PenLine, desc: "Formulaire classique" },
];

interface Props {
  activeMode: InputMode;
  voiceAvailable: boolean;
  onSelect: (mode: InputMode) => void;
  onClose: () => void;
}

export default function PanelInputModeSelector({
  activeMode,
  voiceAvailable,
  onSelect,
  onClose,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="mx-auto max-w-sm rounded-xl border border-border/40 bg-card shadow-lg p-3 space-y-1"
    >
      {MODES.map(({ mode, label, icon: Icon, desc }) => {
        const disabled = mode === "voice" && !voiceAvailable;
        const isActive = activeMode === mode;

        return (
          <button
            key={mode}
            onClick={() => !disabled && onSelect(mode)}
            disabled={disabled}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
              isActive
                ? "bg-primary/10 border border-primary/20 text-primary"
                : disabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-muted/50 text-foreground"
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                isActive ? "bg-primary/20" : "bg-muted"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                {disabled ? "Micro non disponible" : desc}
              </p>
            </div>
          </button>
        );
      })}
    </motion.div>
  );
}
