/**
 * UNPRO — QuoteQualityScorePanel
 * Displays the Quote Quality Score breakdown.
 * Never fabricates data — only scores what's actually extracted.
 */

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck, AlertTriangle, HelpCircle, CheckCircle,
  MessageSquare, ChevronDown,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { QuoteQualityResult, QuoteQualityCategoryScore, QuoteQualityTier } from "@/types/quoteQuality";
import { useState } from "react";

/* ─── Tier styling ─── */
const TIER_STYLES: Record<QuoteQualityTier, { color: string; bg: string; icon: typeof ShieldCheck }> = {
  bien_structure: { color: "text-success", bg: "bg-success/10", icon: ShieldCheck },
  correct: { color: "text-primary", bg: "bg-primary/10", icon: CheckCircle },
  partiel: { color: "text-warning", bg: "bg-warning/10", icon: AlertTriangle },
  faible: { color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle },
};

/* ─── Score Ring ─── */
function ScoreRing({ score, tier }: { score: number; tier: QuoteQualityTier }) {
  const style = TIER_STYLES[tier];
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <motion.circle
          cx="50" cy="50" r="42" fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={style.color}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold font-display ${style.color}`}>{score}</span>
        <span className="text-[9px] text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

/* ─── Category Row ─── */
function CategoryRow({ cat }: { cat: QuoteQualityCategoryScore }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((cat.score / cat.max) * 100);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 py-2.5 group cursor-pointer">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">{cat.label}</span>
              <span className="text-[10px] text-muted-foreground">{cat.score}/{cat.max}</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pb-3 pl-1 space-y-1.5">
          {cat.present.length > 0 && cat.present.map((p, i) => (
            <div key={`p-${i}`} className="flex items-center gap-1.5">
              <CheckCircle className="w-3 h-3 text-success shrink-0" />
              <span className="text-[11px] text-muted-foreground">{p}</span>
            </div>
          ))}
          {cat.missing.length > 0 && cat.missing.map((m, i) => (
            <div key={`m-${i}`} className="flex items-center gap-1.5">
              <HelpCircle className="w-3 h-3 text-muted-foreground/50 shrink-0" />
              <span className="text-[11px] text-muted-foreground/70">{m}</span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ─── Main Panel ─── */
interface QuoteQualityScorePanelProps {
  result: QuoteQualityResult;
}

export default function QuoteQualityScorePanel({ result }: QuoteQualityScorePanelProps) {
  const tierStyle = TIER_STYLES[result.tier];
  const TierIcon = tierStyle.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Score card */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TierIcon className={`w-5 h-5 ${tierStyle.color}`} />
            <h3 className="text-sm font-semibold font-display text-foreground">Score qualité de la soumission</h3>
          </div>

          <ScoreRing score={result.total_score} tier={result.tier} />

          <div className="text-center mt-3">
            <Badge variant="outline" className={`${tierStyle.bg} ${tierStyle.color} border-0 text-xs font-medium`}>
              {result.tier_label}
            </Badge>
          </div>

          {/* Category breakdown */}
          <div className="mt-5 space-y-0 divide-y divide-border/20">
            {result.categories.map((cat) => (
              <CategoryRow key={cat.key} cat={cat} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <h4 className="text-xs font-semibold">Points forts</h4>
            </div>
            <ul className="space-y-1">
              {result.strengths.map((s, i) => (
                <li key={i} className="text-[11px] text-muted-foreground">• {s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Missing info */}
      {result.missing_info.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-xs font-semibold">Informations manquantes</h4>
            </div>
            <ul className="space-y-1">
              {result.missing_info.map((m, i) => (
                <li key={i} className="text-[11px] text-muted-foreground">• {m}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Red flags */}
      {result.red_flags.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h4 className="text-xs font-semibold">Éléments à noter</h4>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Ces observations ne signifient pas un problème certain. Elles méritent une attention particulière.
            </p>
            <ul className="space-y-1">
              {result.red_flags.map((f, i) => (
                <li key={i} className="text-[11px] text-muted-foreground">• {f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Questions to ask */}
      {result.questions_to_ask.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold">Questions à poser à l'entrepreneur</h4>
            </div>
            <ul className="space-y-1.5">
              {result.questions_to_ask.map((q, i) => (
                <li key={i} className="text-[11px] text-foreground font-medium">→ {q}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed px-2">
        Ce score évalue la qualité et la clarté du document, pas la compétence de l'entrepreneur.
        Certaines informations importantes ne sont peut-être pas visibles dans ce document.
      </p>
    </motion.div>
  );
}
