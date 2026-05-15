/**
 * AlexInlineTranscript — Renders Alex chat state.
 *
 * Modes:
 * - liveSpoken[]: ephemeral sentence-by-sentence reveal while Alex is speaking
 * - captionLine: single-line caption (listening / thinking / error)
 * - messages[]: persisted past turns (after speech collapses)
 *
 * Idle returns null — parent owns the idle copy.
 */
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type AlexInlineMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

interface Props {
  messages: AlexInlineMessage[];
  isThinking?: boolean;
  /** Sentences already spoken/being spoken in the current utterance. */
  liveSpoken?: string[];
  /** Short caption (e.g. "Je vous écoute…"). Shown when no liveSpoken. */
  captionLine?: string | null;
  captionTone?: "neutral" | "error";
}

export default function AlexInlineTranscript({
  messages,
  isThinking,
  liveSpoken,
  captionLine,
  captionTone = "neutral",
}: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isThinking, liveSpoken?.length, captionLine]);

  const hasLive = !!liveSpoken && liveSpoken.length > 0;
  const hasCaption = !!captionLine;
  const hasMessages = messages.length > 0;

  if (!hasLive && !hasCaption && !hasMessages && !isThinking) return null;

  return (
    <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto px-1 py-2">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-snug whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-blue-500/90 text-white rounded-br-sm"
                : "bg-white/10 text-white border border-white/10 rounded-bl-sm"
            }`}
          >
            {m.text}
          </div>
        </div>
      ))}

      {/* Live, sentence-by-sentence reveal while Alex speaks */}
      {hasLive && (
        <div className="flex justify-start">
          <div className="max-w-[92%] rounded-2xl rounded-bl-sm px-4 py-3 bg-white/[0.06] border border-white/10 text-white">
            <AnimatePresence initial={false}>
              {liveSpoken!.map((s, i) => (
                <motion.p
                  key={`${i}-${s.slice(0, 12)}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="text-[15px] leading-snug"
                >
                  {s}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Status caption (listening / thinking / error) */}
      {!hasLive && hasCaption && (
        <div className="flex justify-start">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs ${
              captionTone === "error"
                ? "bg-amber-500/10 border border-amber-400/30 text-amber-200"
                : "bg-white/[0.06] border border-white/10 text-white/75"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                captionTone === "error" ? "bg-amber-300" : "bg-blue-300"
              } animate-pulse`}
            />
            {captionLine}
          </motion.div>
        </div>
      )}

      {isThinking && !hasLive && !hasCaption && (
        <div className="flex justify-start">
          <div className="bg-white/10 border border-white/10 text-white/70 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
