/**
 * Alex 100M — Input
 * Always usable. Enter sends. French-first placeholder.
 */

import { useState, useCallback, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { useAlexStore } from "./state/alexStore";

interface AlexInputProps {
  onSend: (text: string) => void;
}

export function AlexInput({ onSend }: AlexInputProps) {
  const [value, setValue] = useState("");
  const mode = useAlexStore((s) => s.mode);
  const lang = useAlexStore((s) => s.activeLanguage);

  const disabled = mode === "booting";

  const placeholder = lang === "fr-CA"
    ? "Décrivez votre projet ou votre problème…"
    : "Describe your project or problem…";

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }, [value, onSend]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Typing keeps engagement active
  const handleChange = (text: string) => {
    setValue(text);
    if (text.length > 0) {
      useAlexStore.getState().markUserEngaged();
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-border/30 bg-card/50 backdrop-blur-sm">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none disabled:opacity-40"
        autoComplete="off"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label={lang === "fr-CA" ? "Envoyer" : "Send"}
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
