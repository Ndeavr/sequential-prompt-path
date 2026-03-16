/**
 * UNPRO Authority Score — Dark SaaS Dashboard Component
 */
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Camera, MessageSquare, MapPin, Brain, Gem, ShieldCheck, ArrowRight,
} from "lucide-react";
import { useState } from "react";

// ─── Data ───

const SCORE_TOTAL = 1000;
const SCORE_CURRENT = 400;

const factors = [
  { label: "Expertise", value: 160, max: 250, color: "hsl(222 100% 65%)" },
  { label: "Activité", value: 90, max: 150, color: "hsl(252 100% 72%)" },
  { label: "Zone desservie", value: 80, max: 150, color: "hsl(195 100% 55%)" },
  { label: "Priorité IA", value: 30, max: 200, color: "hsl(38 92% 50%)" },
  { label: "Rareté", value: 25, max: 150, color: "hsl(152 69% 42%)" },
  { label: "Crédibilité", value: 15, max: 100, color: "hsl(0 72% 50%)" },
];

const suggestions = [
  { points: 40, text: "Ajouter 5 photos de projets", icon: Camera },
  { points: 30, text: "Répondre aux avis Google", icon: MessageSquare },
  { points: 50, text: "Compléter les villes desservies", icon: MapPin },
];

// ─── Score Ring ───

function ScoreRing({ score, max }: { score: number; max: number }) {
  const size = 180;
  const stroke = 10;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / max) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow */}
      <div className="absolute w-40 h-40 rounded-full bg-primary/10 blur-2xl" />
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(228 20% 12%)" strokeWidth={stroke}
        />
        {/* Gradient arc */}
        <defs>
          <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(222 100% 65%)" />
            <stop offset="50%" stopColor="hsl(252 100% 72%)" />
            <stop offset="100%" stopColor="hsl(195 100% 55%)" />
          </linearGradient>
        </defs>
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#score-gradient)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.6, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className="text-4xl font-bold font-display text-foreground"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-sm text-muted-foreground">/ {max}</span>
        <span className="text-[11px] text-muted-foreground mt-1">Score actuel</span>
      </div>
    </div>
  );
}

// ─── Factor Bar ───

function FactorBar({ label, value, max, color, index }: {
  label: string; value: number; max: number; color: string; index: number;
}) {
  const pct = (value / max) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">{value} / {max}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 + index * 0.1 }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function UNPROAuthorityScore() {
  const [showAnalysis, setShowAnalysis] = useState(false);

  return (
    <div className="dark min-h-screen bg-background p-4 md:p-8 space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-display text-xl font-bold text-foreground">
          UNPRO Authority Score
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Votre visibilité et crédibilité sur UNPRO.
        </p>
      </motion.div>

      {/* Score Ring Card */}
      <Card className="border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden">
        <CardContent className="py-8 flex flex-col items-center gap-6">
          <ScoreRing score={SCORE_CURRENT} max={SCORE_TOTAL} />

          {/* Factor Bars */}
          <div className="w-full space-y-3 pt-2">
            {factors.map((f, i) => (
              <FactorBar key={f.label} {...f} index={i} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suggestions Card */}
      <Card className="border-border/40 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Améliorez votre score
          </h2>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <motion.div
                key={s.text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.12 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                  <s.icon className="w-4 h-4" />
                </div>
                <span className="text-sm text-foreground flex-1">{s.text}</span>
                <span className="text-xs font-bold font-display text-success">
                  +{s.points}
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        <Button
          onClick={() => setShowAnalysis(!showAnalysis)}
          className="w-full h-12 text-sm font-semibold gap-2 bg-primary hover:bg-primary/90"
        >
          <Brain className="w-4 h-4" />
          Analyser mon profil avec Alex
          <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>

      {/* AI Analysis Panel */}
      {showAnalysis && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-primary/30 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-accent" />
            <CardContent className="py-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Analyse Alex
                </h3>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  Votre score de <span className="text-foreground font-semibold">400/1000</span> indique un profil en construction. Voici mes recommandations prioritaires :
                </p>

                <div className="space-y-2">
                  {[
                    { icon: ShieldCheck, title: "Crédibilité (15/100)", desc: "Ajoutez votre numéro RBQ et une preuve d'assurance pour gagner jusqu'à 60 points." },
                    { icon: Camera, title: "Expertise (160/250)", desc: "5 photos de projets récents augmenteraient votre score de 40 points et votre visibilité dans les résultats IA." },
                    { icon: MapPin, title: "Zone desservie (80/150)", desc: "Complétez vos villes pour maximiser votre couverture géographique (+50 pts)." },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="p-3 rounded-xl bg-muted/20 border border-border/20"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <item.icon className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-foreground">{item.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground/70 pt-1">
                  En appliquant ces 3 actions, votre score passerait à environ <span className="text-primary font-semibold">550/1000</span>.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
