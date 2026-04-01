/**
 * ChatAlexSecondary — Minimal chat interface connected to Alex.
 * Fallback from voice, bridge to form if needed.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Mic, PenLine, Sparkles } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

interface Message {
  id: string;
  sender: "user" | "alex";
  text: string;
}

interface Props {
  feature?: string;
  onMessage?: (msg: string) => void;
  onFailure?: () => void;
  onSwitchToForm?: () => void;
}

const ALEX_GREETINGS: Record<string, string> = {
  general: "Bonjour ! Décrivez-moi votre projet ou votre problème. Je vous guide.",
  diagnostic: "Bonjour ! Quel problème avez-vous remarqué dans votre propriété ?",
  find: "Bonjour ! Quel type de professionnel recherchez-vous ?",
  photo: "Bonjour ! Envoyez-moi une photo de votre problème, je vais analyser ça.",
};

export default function ChatAlexSecondary({
  feature = "general",
  onMessage,
  onFailure,
  onSwitchToForm,
}: Props) {
  const { openAlex } = useAlexVoice();
  const [messages, setMessages] = useState<Message[]>([
    { id: "greeting", sender: "alex", text: ALEX_GREETINGS[feature] || ALEX_GREETINGS.general },
  ]);
  const [input, setInput] = useState("");
  const [emptyAttempts, setEmptyAttempts] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setEmptyAttempts((p) => {
        if (p >= 2) onFailure?.();
        return p + 1;
      });
      return;
    }

    const userMsg: Message = { id: crypto.randomUUID(), sender: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    onMessage?.(trimmed);

    // Simulate Alex response (in production, this connects to the Alex backend)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "alex",
          text: "Merci ! Je comprends votre besoin. Laissez-moi trouver la meilleure solution pour vous.",
        },
      ]);
    }, 800);
  }, [input, onMessage, onFailure]);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border/40 bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-accent">
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground">Alex</span>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => openAlex(feature)}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            title="Passer en mode voix"
          >
            <Mic className="h-4 w-4" />
          </button>
          {onSwitchToForm && (
            <button
              onClick={onSwitchToForm}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              title="Remplir manuellement"
            >
              <PenLine className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-border/30 p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Décrivez votre projet..."
            className="flex-1 rounded-full border border-border/60 bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleSend}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
