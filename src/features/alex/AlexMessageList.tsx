/**
 * Alex 100M — Message List
 * Renders optimistic user + assistant messages. Premium styling.
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAlexStore } from "./state/alexStore";

export function AlexMessageList() {
  const messages = useAlexStore((s) => s.messages);
  const mode = useAlexStore((s) => s.mode);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-muted">
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary/15 text-foreground border border-primary/20"
                  : "bg-card/80 text-foreground border border-border/50"
              }`}
            >
              {msg.role === "assistant" && (
                <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider block mb-1">
                  Alex
                </span>
              )}
              {msg.text}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Thinking indicator */}
      {mode === "thinking" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-start"
        >
          <div className="bg-card/80 border border-border/50 rounded-2xl px-4 py-2.5 flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider">Alex</span>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary/50"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
