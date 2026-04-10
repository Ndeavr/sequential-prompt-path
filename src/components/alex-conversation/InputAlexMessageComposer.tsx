import { useState, useRef, useCallback } from "react";
import { Send, Mic, Square } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
  onMicToggle: () => void;
  isMicActive: boolean;
  disabled?: boolean;
}

export default function InputAlexMessageComposer({ onSend, onMicToggle, isMicActive, disabled }: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  }, [text, disabled, onSend]);

  return (
    <div className="flex items-center gap-2 p-3 bg-card/90 backdrop-blur-md border-t border-border/40">
      <button
        onClick={onMicToggle}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isMicActive
            ? "bg-destructive/90 text-destructive-foreground shadow-lg"
            : "bg-muted/60 text-muted-foreground hover:bg-muted"
        }`}
        aria-label={isMicActive ? "Arrêter le micro" : "Activer le micro"}
      >
        {isMicActive ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleSend()}
        placeholder="Décrivez votre besoin..."
        disabled={disabled}
        className="flex-1 bg-muted/40 border border-border/40 rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-opacity"
        aria-label="Envoyer"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
