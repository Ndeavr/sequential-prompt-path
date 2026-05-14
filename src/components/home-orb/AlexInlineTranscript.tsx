/**
 * AlexInlineTranscript — Stacked message bubbles for the homepage inline chat.
 * No overlay, no route push. Auto-scrolls to the latest message.
 */
import { useEffect, useRef } from "react";

export type AlexInlineMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

interface Props {
  messages: AlexInlineMessage[];
  isThinking?: boolean;
  variant?: "dark" | "warm";
}

export default function AlexInlineTranscript({ messages, isThinking, variant = "dark" }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isThinking]);

  if (messages.length === 0 && !isThinking) return null;

  const userBubble =
    variant === "warm"
      ? "bg-[#0E5E4E] text-white rounded-br-sm"
      : "bg-blue-500/90 text-white rounded-br-sm";
  const assistantBubble =
    variant === "warm"
      ? "bg-white text-[#0F1B2D] border border-[#0F1B2D]/10 rounded-bl-sm shadow-sm"
      : "bg-white/10 text-white border border-white/10 rounded-bl-sm";
  const thinkingBubble =
    variant === "warm"
      ? "bg-white border border-[#0F1B2D]/10 text-[#0F1B2D]/60 shadow-sm"
      : "bg-white/10 border border-white/10 text-white/70";
  const dotColor = variant === "warm" ? "bg-[#0E5E4E]" : "bg-blue-300";

  return (
    <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto px-1 py-2">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-snug whitespace-pre-wrap ${
              m.role === "user" ? userBubble : assistantBubble
            }`}
          >
            {m.text}
          </div>
        </div>
      ))}
      {isThinking && (
        <div className="flex justify-start">
          <div className={`rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm inline-flex items-center gap-1.5 ${thinkingBubble}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`}
              style={{ animationDelay: "150ms" }}
            />
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`}
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
