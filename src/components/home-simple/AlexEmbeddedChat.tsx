/**
 * AlexEmbeddedChat — Greeting bubble + persistent text input + upload, inline on the page.
 * Wired to the Alex feature via useAlexUIBridge. Stays visible above mobile keyboard.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip } from "lucide-react";
import { useAlexUIBridge } from "@/features/alex/hooks/useAlexUIBridge";
import { useAlexStore } from "@/features/alex/state/alexStore";

export default function AlexEmbeddedChat() {
  const { onTextSubmit, onFileUpload } = useAlexUIBridge();
  const messages = useAlexStore((s) => s.messages);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  // Keep input visible above mobile keyboard
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handler = () => {
      // reserve viewport offset so the input stays in view; CSS handles the rest
      document.documentElement.style.setProperty("--kb-offset", `${Math.max(0, window.innerHeight - vv.height)}px`);
    };
    vv.addEventListener("resize", handler);
    handler();
    return () => vv.removeEventListener("resize", handler);
  }, []);

  // Show only the latest assistant greeting if there are no messages yet
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const greeting =
    lastAssistant?.text ??
    "Bonjour ! Je suis Alex.\nDécrivez votre problème ou votre projet, je vais vous aider étape par étape.";

  const submit = async () => {
    const t = value.trim();
    if (!t) return;
    setValue("");
    await onTextSubmit(t);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const triggerUpload = () => {
    onFileUpload();
    fileInputRef.current?.click();
  };

  return (
    <section className="px-5 pt-2 pb-6 space-y-4">
      {/* Greeting bubble card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl bg-card/70 backdrop-blur-xl border border-border/40 shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.15)] p-4 flex gap-3 items-start"
      >
        <div className="shrink-0 w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold">
          A
        </div>
        <p className="text-sm md:text-base text-foreground leading-relaxed whitespace-pre-line">
          {greeting}
        </p>
      </motion.div>

      {/* Input card — sticky-ish to stay above keyboard */}
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
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/70 outline-none py-2"
          />
          <button
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Envoyer"
            className="shrink-0 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 active:scale-95 transition-all shadow-md"
          >
            <Send className="w-4 h-4" />
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
