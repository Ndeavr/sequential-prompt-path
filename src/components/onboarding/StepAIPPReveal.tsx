import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, ChevronRight, Zap, TrendingUp, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumMagneticButton } from "@/components/ui/PremiumMagneticButton";
import type { OnboardingAIPPScore } from "@/services/businessImportService";

interface Props {
  score: OnboardingAIPPScore;
  onContinue: () => void;
}

const tierConfig: Record<string, { gradient: string; glow: string }> = {
  Bronze: { gradient: "from-amber-700 to-amber-500", glow: "shadow-[0_0_40px_-8px_hsl(30_80%_50%/0.3)]" },
  Silver: { gradient: "from-slate-400 to-slate-300", glow: "shadow-[0_0_40px_-8px_hsl(220_10%_60%/0.3)]" },
  Gold: { gradient: "from-yellow-500 to-amber-400", glow: "shadow-[0_0_40px_-8px_hsl(45_90%_50%/0.3)]" },
  Elite: { gradient: "from-primary to-accent", glow: "shadow-[var(--shadow-glow-lg)]" },
  Authority: { gradient: "from-secondary to-primary", glow: "shadow-[var(--shadow-glow-lg)]" },
};

const pillarLabels: Record<string, string> = {
  identity: "Identity",
  trust: "Trust",
  visibility: "Visibility",
  conversion: "Conversion",
  aiSeo: "AI / SEO Readiness",
};

export default function StepAIPPReveal({ score, onContinue }: Props) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showPillars, setShowPillars] = useState(false);
  const [showOpportunities, setShowOpportunities] = useState(false);

  useEffect(() => {
    let frame: number;
    const duration = 2200;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setAnimatedScore(Math.round(eased * score.total));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    setTimeout(() => setShowPillars(true), 1800);
    setTimeout(() => setShowOpportunities(true), 2600);
    return () => cancelAnimationFrame(frame);
  }, [score.total]);

  const tier = tierConfig[score.tier] || tierConfig.Bronze;
  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="dark min-h-screen px-4 py-10">
      <div className="w-full max-w-lg mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            Your AIPP Score
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            How complete, trustworthy, visible, and growth-ready your business profile is.
          </p>
        </motion.div>

        {/* Score ring — cinematic reveal */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 120, damping: 15 }}
          className="flex flex-col items-center gap-5"
        >
          <div className={`relative w-44 h-44 ${tier.glow} rounded-full`}>
            {/* Outer pulse rings */}
            <motion.div
              className="absolute inset-[-16px] rounded-full border border-primary/[0.08]"
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-[-8px] rounded-full border border-accent/[0.12]"
              animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.1, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            />
            {/* Background glow */}
            <motion.div
              className={`absolute inset-[-6px] rounded-full bg-gradient-to-br ${tier.gradient} blur-3xl opacity-20`}
              animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            {/* Ring */}
            <svg viewBox="0 0 128 128" className="w-44 h-44 -rotate-90 relative z-10">
              <circle cx="64" cy="64" r="58" fill="none" stroke="hsl(var(--muted)/0.2)" strokeWidth="5" />
              <motion.circle
                cx="64" cy="64" r="58" fill="none" stroke="url(#aippGrad)" strokeWidth="5"
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                className="transition-all duration-75"
              />
              <defs>
                <linearGradient id="aippGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="50%" stopColor="hsl(var(--accent))" />
                  <stop offset="100%" stopColor="hsl(var(--secondary))" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              <motion.span
                key={animatedScore}
                className="text-5xl font-bold font-display text-foreground"
              >
                {animatedScore}
              </motion.span>
              <span className="text-xs text-muted-foreground/60">/100</span>
            </div>
          </div>

          {/* Tier badge */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.5, type: "spring" }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${tier.gradient} text-white text-xs font-bold uppercase tracking-wider shadow-lg`}
          >
            <Crown className="w-3.5 h-3.5" /> {score.tier} Tier
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="text-xs text-muted-foreground"
          >
            Top <span className="text-foreground font-semibold">{100 - score.percentile}%</span> in your area
          </motion.p>
        </motion.div>

        {/* Pillar breakdown */}
        <AnimatePresence>
          {showPillars && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {Object.entries(score.pillars).map(([key, pillar], i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{pillarLabels[key] || key}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{pillar.score}</span>
                      <span className="text-[10px] text-muted-foreground/50">/ {pillar.max}</span>
                    </div>
                  </div>
                  <div className="h-[3px] rounded-full bg-muted/20 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${(pillar.score / pillar.max) * 100}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{pillar.explanation}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pillar.quickWins.map((w, j) => (
                      <span key={j} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/[0.06] text-primary/80 border border-primary/10 font-medium">
                        <Zap className="w-2.5 h-2.5" /> {w}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top opportunities */}
        <AnimatePresence>
          {showOpportunities && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-primary/20 bg-primary/[0.03] backdrop-blur-sm p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Top Opportunities</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {score.topOpportunities.slice(0, 6).map((opp, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="text-[11px] text-muted-foreground py-1.5 px-2 rounded-lg bg-muted/10 border border-border/20"
                  >
                    {opp}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <PremiumMagneticButton
          onReleaseAction={onContinue}
          variant="indigo"
          fullWidth
          iconRight={<ChevronRight className="w-4 h-4" />}
          className="h-13 text-base font-semibold"
        >
          Choose your objective
        </PremiumMagneticButton>
      </div>
    </div>
  );
}
