/**
 * CardConversationPreviewAlexUploadIceDamBookingFlow
 * Premium conversational ad preview — autoplay scenario
 */
import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Bot, Play, RotateCcw } from "lucide-react";
import { useConversationAutoPlay } from "./useConversationAutoPlay";
import {
  TypingIndicator,
  UserImageUpload,
  UserTextMessage,
  AlexDiagnosis,
  AlexRecommendation,
  AlexTextResponse,
  WhyThisChoice,
  MiniCalendar,
  BookingConfirmed,
} from "./ConversationBubbles";
import type { ConversationStep } from "./data";

function StepRenderer({ step }: { step: ConversationStep }) {
  switch (step.type) {
    case "typing": return <TypingIndicator />;
    case "user-image": return <UserImageUpload />;
    case "user-text": return <UserTextMessage text={step.content!} />;
    case "alex-text": return <AlexTextResponse text={step.content!} speaking={!!step.voice} voice={!!step.voice} />;
    case "alex-diagnosis": return <AlexDiagnosis text={step.content!} />;
    case "alex-recommendation": return <AlexRecommendation text={step.content!} />;
    case "alex-why": return <WhyThisChoice />;
    case "alex-calendar": return <MiniCalendar />;
    case "alex-slot-ask": return <AlexTextResponse text={step.content!} speaking glow voice />;
    case "booking-confirmed": return <BookingConfirmed />;
    default: return null;
  }
}

export default function CardConversationPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { visibleSteps, isPlaying, isComplete, play, reset } = useConversationAutoPlay();

  // Auto-start when in view
  useEffect(() => {
    if (isInView && !isPlaying && !isComplete) {
      const t = setTimeout(play, 600);
      return () => clearTimeout(t);
    }
  }, [isInView, isPlaying, isComplete, play]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visibleSteps]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-md mx-auto"
    >
      {/* Phone frame */}
      <div className="rounded-[2rem] border border-border/40 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Alex · UNPRO</p>
              <p className="text-[10px] text-muted-foreground">
                {isPlaying ? "En ligne · Parle…" : isComplete ? "Conversation terminée" : "En ligne"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          </div>
        </div>

        {/* Conversation area */}
        <div
          ref={scrollRef}
          className="h-[420px] sm:h-[480px] overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-border/30"
        >
          {visibleSteps.map(step => (
            <StepRenderer key={step.id} step={step} />
          ))}

          {/* Empty state */}
          {visibleSteps.length === 0 && !isPlaying && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary/60" />
              </div>
              <p className="text-xs text-muted-foreground">La démo démarre automatiquement…</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2.5 border-t border-border/30 bg-muted/20">
          {isComplete ? (
            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary/10 hover:bg-primary/15 text-primary text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Rejouer la démo
            </button>
          ) : (
            <div className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-muted/40 border border-border/30">
              <span className="text-[11px] text-muted-foreground/60 flex-1">Démonstration automatique…</span>
              <Play className="w-3.5 h-3.5 text-muted-foreground/40" />
            </div>
          )}
        </div>
      </div>

      {/* Glow behind card */}
      <div className="absolute -inset-4 -z-10 rounded-[3rem] bg-primary/5 blur-3xl" />
    </motion.div>
  );
}
