import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OnboardingAIPPScore } from "@/services/businessImportService";

interface Props {
  score: OnboardingAIPPScore;
  onContinue: () => void;
}

const tierColors: Record<string, string> = {
  Bronze: "from-amber-700 to-amber-500",
  Silver: "from-slate-400 to-slate-300",
  Gold: "from-yellow-500 to-amber-400",
  Elite: "from-primary to-accent",
  Authority: "from-secondary to-primary",
};

export default function StepAIPPReveal({ score, onContinue }: Props) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let frame: number;
    const duration = 2000;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score.total));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score.total]);

  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="dark min-h-screen px-4 py-12">
      <div className="w-full max-w-lg mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">Your AIPP Score</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">How complete, trustworthy, visible, and growth-ready your business profile is.</p>
        </motion.div>

        {/* Score ring */}
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, type: "spring" }}
          className="flex flex-col items-center gap-4">
          <div className="relative w-40 h-40">
            <motion.div
              className="absolute inset-[-8px] rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-2xl"
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <svg viewBox="0 0 128 128" className="w-40 h-40 -rotate-90">
              <circle cx="64" cy="64" r="58" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <circle cx="64" cy="64" r="58" fill="none" stroke="url(#scoreGrad)" strokeWidth="6"
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                className="transition-all duration-100"
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold font-display text-foreground">{animatedScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>

          {/* Tier badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${tierColors[score.tier]} text-white text-xs font-bold uppercase tracking-wider`}>
            <Award className="w-3.5 h-3.5" /> {score.tier}
          </div>
          <p className="text-xs text-muted-foreground">Top {100 - score.percentile}% in your area</p>
        </motion.div>

        {/* Pillars */}
        <div className="space-y-2.5">
          {Object.entries(score.pillars).map(([key, pillar], i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground capitalize">{key === "aiSeo" ? "AI / SEO Readiness" : key}</span>
                <span className="text-sm font-bold text-primary">{pillar.score}/{pillar.max}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }} animate={{ width: `${(pillar.score / pillar.max) * 100}%` }}
                  transition={{ delay: 1 + i * 0.1, duration: 0.6 }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{pillar.explanation}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {pillar.quickWins.map((w, j) => (
                  <span key={j} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <Zap className="w-2.5 h-2.5" /> {w}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <Button onClick={onContinue} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 border-0 rounded-xl gap-2">
          Choose your objective <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
