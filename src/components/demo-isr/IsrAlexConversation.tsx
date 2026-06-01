import { useEffect, useRef, useState } from "react";
import {
  ISR_QUESTIONS,
  type IsrAnswers,
  type IsrAnswerKey,
  ISR_RECOMMENDATION_REASON,
} from "@/config/isrDemoConfig";

type Msg =
  | { from: "alex"; text: string }
  | { from: "user"; text: string };

interface Props {
  answers: IsrAnswers;
  onAnswer: (key: IsrAnswerKey, value: string) => void;
  recommended: "Signature" | null;
}

export default function IsrAlexConversation({ answers, onAnswer, recommended }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: "alex",
      text: "Bonjour Danny. Je vais analyser les objectifs d'Isolation Solution Royal pour recommander le bon plan UNPRO.",
    },
  ]);
  const greetedRef = useRef(false);
  const askedRef = useRef<Set<IsrAnswerKey>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine next question index
  const nextIndex = ISR_QUESTIONS.findIndex((q) => !answers[q.key]);
  const currentQ = nextIndex >= 0 ? ISR_QUESTIONS[nextIndex] : null;

  // Push next question as an Alex bubble when we move forward
  useEffect(() => {
    if (!greetedRef.current) {
      greetedRef.current = true;
      if (ISR_QUESTIONS[0]) {
        setMessages((m) => [...m, { from: "alex", text: ISR_QUESTIONS[0].label }]);
        askedRef.current.add(ISR_QUESTIONS[0].key);
      }
      return;
    }
    if (currentQ && !askedRef.current.has(currentQ.key)) {
      askedRef.current.add(currentQ.key);
      setMessages((m) => [...m, { from: "alex", text: currentQ.label }]);
    }
    if (!currentQ && recommended) {
      setMessages((m) => {
        if (m.some((x) => x.from === "alex" && x.text.startsWith("Plan recommandé"))) return m;
        return [
          ...m,
          { from: "alex", text: `Plan recommandé: ${recommended}.` },
          { from: "alex", text: ISR_RECOMMENDATION_REASON },
        ];
      });
    }
  }, [currentQ, recommended]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handlePick = (value: string) => {
    if (!currentQ) return;
    setMessages((m) => [...m, { from: "user", text: value }]);
    onAnswer(currentQ.key, value);
  };

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-cyan-400/60 to-indigo-500/60 shadow-[0_0_40px_rgba(56,189,248,0.45)]">
          <div className="absolute inset-1 rounded-full bg-[#050816]/40 backdrop-blur" />
        </div>
        <div>
          <div className="text-sm font-medium text-white">Alex</div>
          <div className="text-[11px] text-cyan-200/70">Concierge UNPRO</div>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-[420px] overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "alex" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.from === "alex"
                  ? "bg-white/[0.06] text-white/90 border border-white/5"
                  : "bg-cyan-400/20 text-white border border-cyan-300/30"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {currentQ && (
        <div className="px-5 pb-5 pt-2 border-t border-white/5">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2.5">
            Choisissez une réponse
          </div>
          <div className="flex flex-wrap gap-2">
            {currentQ.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handlePick(opt)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/90 hover:bg-white/[0.09] hover:-translate-y-0.5 transition-all duration-[420ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
