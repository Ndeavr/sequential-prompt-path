/**
 * ChatThreadDynamic — Dynamic conversation thread with follow-up questions.
 */
import { motion } from "framer-motion";
import type { FollowupQuestion } from "@/hooks/useIntentFunnel";

interface Props {
  questions: FollowupQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, answer: string) => void;
}

export default function ChatThreadDynamic({ questions, answers, onAnswer }: Props) {
  const currentIndex = Object.keys(answers).length;

  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const isAnswered = !!answers[q.id];
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;

        if (isFuture) return null;

        return (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="space-y-2"
          >
            {/* Alex question */}
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-muted/80 px-4 py-3 border border-border/40">
                <p className="text-sm text-foreground">{q.question}</p>
              </div>
            </div>

            {/* Answer options or answered */}
            {isAnswered ? (
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-tr-md bg-primary/90 px-4 py-2.5">
                  <p className="text-sm text-primary-foreground">{answers[q.id]}</p>
                </div>
              </div>
            ) : isCurrent && q.options ? (
              <div className="flex flex-wrap gap-2 pl-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => onAnswer(q.id, opt)}
                    className="px-4 py-2 rounded-xl text-sm font-medium
                      bg-muted/60 border border-border/60 text-foreground
                      hover:bg-primary/15 hover:border-primary/40 hover:text-primary
                      active:scale-95 transition-all duration-200"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : null}
          </motion.div>
        );
      })}

      {currentIndex >= questions.length && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start"
        >
          <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-muted/80 px-4 py-3 border border-border/40">
            <p className="text-sm text-foreground">Parfait! Je cherche les meilleurs professionnels pour vous…</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.1s" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }} />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
