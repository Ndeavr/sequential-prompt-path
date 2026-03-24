/**
 * UNPRO — Alex Market Closer Panel (sticky mobile-first)
 */
import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AlexScript } from "@/lib/alexPredictiveScripts";
import { getAlexToneEmoji, getAlexToneLabel } from "@/lib/alexPredictiveScripts";

interface Props {
  script: AlexScript;
  onCtaClick?: () => void;
  onSecondaryClick?: () => void;
}

const toneBorder: Record<string, string> = {
  empathetic: "border-blue-500/30",
  confident: "border-primary/30",
  urgent: "border-orange-500/30",
  reassuring: "border-emerald-500/30",
  exclusive: "border-violet-500/30",
};

const toneGlow: Record<string, string> = {
  empathetic: "shadow-blue-500/10",
  confident: "shadow-primary/10",
  urgent: "shadow-orange-500/10",
  reassuring: "shadow-emerald-500/10",
  exclusive: "shadow-violet-500/10",
};

export default function AlexMarketCloserPanel({ script, onCtaClick, onSecondaryClick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className={`rounded-2xl border ${toneBorder[script.tone] || "border-border/30"} bg-card/80 backdrop-blur-sm p-4 space-y-3 shadow-lg ${toneGlow[script.tone] || ""}`}
    >
      {/* Alex header */}
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">Alex</span>
            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold flex items-center gap-0.5">
              {getAlexToneEmoji(script.tone)} {getAlexToneLabel(script.tone)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">Assistant prédictif UNPRO</p>
        </div>
        <Sparkles className="h-4 w-4 text-primary/50" />
      </div>

      {/* Greeting */}
      <p className="text-sm font-semibold text-foreground">{script.greeting}</p>

      {/* Pitch */}
      <p className="text-xs text-muted-foreground leading-relaxed">{script.pitch}</p>

      {/* Objection handling */}
      <div className="rounded-xl bg-muted/20 border border-border/10 p-3">
        <p className="text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-wider mb-1">Pourquoi maintenant</p>
        <p className="text-xs text-foreground/80 leading-relaxed">{script.objection_handling}</p>
      </div>

      {/* CTA */}
      <div className="space-y-2">
        <Button
          onClick={onCtaClick}
          className="w-full h-10 text-sm font-semibold"
          size="sm"
        >
          {script.cta_label}
        </Button>
        {script.secondary_action && (
          <button
            onClick={onSecondaryClick}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
          >
            {script.secondary_action}
          </button>
        )}
      </div>

      {/* Confidence note */}
      <p className="text-[10px] text-muted-foreground/50 leading-relaxed">{script.confidence_note}</p>
    </motion.div>
  );
}
