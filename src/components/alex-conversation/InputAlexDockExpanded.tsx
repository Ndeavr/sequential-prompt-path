/**
 * InputAlexDockExpanded — Premium expanded input dock.
 * Taller, glass effect, large integrated mic, visible send.
 * Mobile-first, always visible at bottom.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Mic, Square, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onSend: (text: string) => void;
  onMicToggle: () => void;
  isMicActive: boolean;
  isVoiceConnecting?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function InputAlexDockExpanded({
  onSend,
  onMicToggle,
  isMicActive,
  isVoiceConnecting = false,
  disabled,
  placeholder = "Décrivez votre besoin...",
}: Props) {
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  }, [text, disabled, onSend]);

  const showSend = text.trim().length > 0;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative"
    >
      {/* Glow effect when focused */}
      <AnimatePresence>
        {(isFocused || isMicActive) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-4 left-0 right-0 h-8 pointer-events-none"
            style={{
              background: "linear-gradient(to top, hsl(var(--primary) / 0.06), transparent)",
            }}
          />
        )}
      </AnimatePresence>

      <div
        className={`flex items-center gap-3 px-4 py-4 border-t transition-all duration-300 ${
          isFocused || isMicActive
            ? "bg-card/95 backdrop-blur-xl border-primary/20 shadow-[0_-4px_20px_hsl(var(--primary)/0.08)]"
            : "bg-card/80 backdrop-blur-md border-border/40"
        }`}
        style={{ minHeight: 80 }}
      >
        {/* Mic button — large, integrated */}
        <button
          onClick={onMicToggle}
          disabled={isVoiceConnecting}
          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            isVoiceConnecting
              ? "bg-primary/20 text-primary animate-pulse"
              : isMicActive
              ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25 scale-105"
              : "bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 active:scale-95"
          }`}
          aria-label={isMicActive ? "Arrêter" : "Parler à Alex"}
        >
          {isVoiceConnecting ? (
            <Sparkles className="w-5 h-5 animate-spin" />
          ) : isMicActive ? (
            <Square className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        {/* Text input — large */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isMicActive}
            className={`w-full bg-muted/50 border rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all duration-200 ${
              isFocused
                ? "border-primary/30 ring-2 ring-primary/10 bg-background/80"
                : "border-border/30"
            } ${isMicActive ? "opacity-40" : ""}`}
          />
          {isMicActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs text-primary font-medium animate-pulse">
                Alex écoute...
              </span>
            </div>
          )}
        </div>

        {/* Send button */}
        <AnimatePresence mode="wait">
          {showSend && (
            <motion.button
              key="send"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={handleSend}
              disabled={!text.trim() || disabled}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-opacity shadow-lg shadow-primary/20"
              aria-label="Envoyer"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
