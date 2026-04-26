/**
 * AlexChatFallbackPanel — Full-screen chat that opens when voice fails.
 * Reuses `useAlex()` (alex-chat edge function). Independent of any voice session.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAlexChatFallbackStore } from "@/stores/alexChatFallbackStore";
import { useAlex } from "@/hooks/useAlex";
import UnproIcon from "@/components/brand/UnproIcon";

export default function AlexChatFallbackPanel() {
  const { isOpen, reason, seedTurns, close } = useAlexChatFallbackStore();
  const { messages, sendMessage, isStreaming } = useAlex();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);

  // Seed historic turns for visual continuity (read-only).
  const seededMessages =
    !seededRef.current && seedTurns.length > 0
      ? seedTurns.map((t) => ({
          role: t.role === "alex" ? "assistant" : "user",
          content: t.text,
        }))
      : [];

  useEffect(() => {
    if (isOpen) seededRef.current = true;
    if (!isOpen) seededRef.current = false;
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const allMessages = [...seededMessages, ...messages];

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    await sendMessage(text, { voiceMode: false });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-[10000] flex flex-col bg-background"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-primary/30 bg-card flex items-center justify-center">
              <UnproIcon size={22} variant="blue" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Alex — Mode chat</p>
              <p className="text-xs text-muted-foreground">
                {reason === "permission_denied"
                  ? "Micro désactivé. On continue par chat."
                  : "La voix d'Alex est temporairement indisponible."}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Fermer le chat">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <div className="flex items-center gap-2 mb-1 text-primary">
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">Alex</span>
            </div>
            La voix d'Alex est temporairement indisponible. Je continue ici. Décrivez votre besoin en quelques mots.
          </div>

          {allMessages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {isStreaming && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                Alex écrit…
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border/30 p-3 bg-background">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Écrivez à Alex…"
              rows={1}
              className="min-h-[44px] max-h-32 resize-none rounded-xl"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="rounded-full h-11 w-11 shrink-0"
              aria-label="Envoyer"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
