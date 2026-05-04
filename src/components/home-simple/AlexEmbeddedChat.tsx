/**
 * AlexEmbeddedChat — Conversation thread + persistent input + upload, inline on the page.
 * Shows the FULL message history (Alex + user), not just the last greeting.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { useAlexUIBridge } from "@/features/alex/hooks/useAlexUIBridge";
import { useAlexStore } from "@/features/alex/state/alexStore";

export default function AlexEmbeddedChat() {
  const { onTextSubmit, onFileUpload } = useAlexUIBridge();
  const messages = useAlexStore((s) => s.messages);
  const mode = useAlexStore((s) => s.mode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  // Keyboard offset for mobile
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handler = () => {
      document.documentElement.style.setProperty(
        "--kb-offset",
        `${Math.max(0, window.innerHeight - vv.height)}px`,
      );
    };
    vv.addEventListener("resize", handler);
    handler();
    return () => vv.removeEventListener("resize", handler);
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, mode]);

  const visibleMessages =
    messages.length > 0
      ? messages
      : [
          {
            id: "greeting",
            role: "assistant" as const,
            text:
              "Bonjour ! Je suis Alex.\nDécrivez votre problème ou votre projet, je vais vous aider étape par étape.",
            timestamp: Date.now(),
          },
        ];

  const submit = async () => {
    const t = value.trim();
    if (!t || sending) return;
    setValue("");
    setSending(true);
    try {
      await onTextSubmit(t);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onFileUpload(file);
    e.target.value = "";
  };

  const isThinking = mode === "thinking";

  return (
    <section className="px-5 pt-2 pb-6 space-y-4">
      {/* Conversation thread */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl bg-card/70 backdrop-blur-xl border border-border/40 shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.15)] p-4"
      >
        <div
          ref={scrollRef}
          className="space-y-3 max-h-[44vh] overflow-y-auto pr-1"
        >
          <AnimatePresence initial={false}>
            {visibleMessages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="shrink-0 w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
                    A
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted/50 text-foreground rounded-tl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}

            {isThinking && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-2 justify-start"
              >
                <div className="shrink-0 w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
                <div className="rounded-2xl px-3.5 py-2.5 bg-muted/50 text-muted-foreground text-sm">
                  Alex réfléchit…
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Input card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="rounded-3xl bg-card/80 backdrop-blur-xl border border-border/40 shadow-[0_12px_40px_-16px_hsl(var(--primary)/0.25)] p-4"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (e.target.value.length > 0) useAlexStore.getState().markUserEngaged();
            }}
            onKeyDown={onKeyDown}
            placeholder="Écrivez votre message ici…"
            autoComplete="off"
            disabled={sending}
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/70 outline-none py-2 disabled:opacity-60"
          />
          <button
            onClick={submit}
            disabled={!value.trim() || sending}
            aria-label="Envoyer"
            className="shrink-0 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 active:scale-95 transition-all shadow-md"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-border/30">
          <button
            onClick={triggerUpload}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Paperclip className="w-4 h-4" />
            Téléverser une photo ou un document
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={() => onFileUpload()}
          />
        </div>
      </motion.div>
    </section>
  );
}
