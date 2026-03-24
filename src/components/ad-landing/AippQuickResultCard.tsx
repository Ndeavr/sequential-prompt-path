import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, AlertTriangle, TrendingUp, Zap, MapPin, ExternalLink, ThumbsUp, ThumbsDown } from "lucide-react";
import type { AIPPQuickResult } from "@/services/aippQuickScoreService";

interface Props {
  result: AIPPQuickResult;
  businessName: string;
  city?: string;
  onCreateProfile: () => void;
  onTalkToAlex: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 60 ? "hsl(var(--success))" : score >= 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  const offset = 264 - (264 * score) / 100;
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
        <motion.circle
          cx="50" cy="50" r="42" fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={264}
          initial={{ strokeDashoffset: 264 }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-black text-foreground"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: "spring" }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground font-medium">/100</span>
      </div>
    </div>
  );
}

function VisibilityBadge({ label }: { label: string }) {
  const variant = label === "Dominant" || label === "Fort" ? "default" :
    label === "Présence correcte" ? "secondary" : "destructive";
  return (
    <Badge variant={variant} className="text-sm px-3 py-1">
      {label}
    </Badge>
  );
}

function MarketPositionMini({ position }: { position: string }) {
  const icons: Record<string, typeof TrendingUp> = {
    "en arrière": AlertTriangle,
    "ex aequo": Zap,
    "loin devant": TrendingUp,
    "vous dominez": CheckCircle,
  };
  const Icon = icons[position] || Zap;
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 text-primary" />
      <span>Position marché: <strong className="text-foreground capitalize">{position}</strong></span>
    </div>
  );
}

export default function AippQuickResultCard({ result, businessName, onCreateProfile, onTalkToAlex }: Props) {
  return (
    <motion.div
      className="w-full max-w-md mx-auto space-y-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/5 p-6 text-center space-y-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Score AIPP</p>
          <ScoreRing score={result.score} />
          <VisibilityBadge label={result.label} />
          <h3 className="text-lg font-bold text-foreground">{businessName}</h3>
          <MarketPositionMini position={result.marketPosition} />
        </div>
        <CardContent className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{result.message}</p>

          {result.strengths.length > 0 && (
            <div>
              <p className="text-xs font-bold text-foreground uppercase mb-2">Points forts</p>
              <div className="space-y-1.5">
                {result.strengths.map((s) => (
                  <div key={s} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" />
                    <span className="text-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.quickWins.length > 0 && (
            <div>
              <p className="text-xs font-bold text-foreground uppercase mb-2">Gains rapides</p>
              <div className="space-y-1.5">
                {result.quickWins.map((w) => (
                  <div key={w} className="flex items-center gap-2 text-sm">
                    <Zap className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                    <span className="text-muted-foreground">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button size="lg" className="w-full h-12 text-base font-bold" onClick={onCreateProfile}>
          Créer mon profil intelligent <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline" className="w-full h-12 text-base" onClick={onTalkToAlex}>
          Continuer avec Alex
        </Button>
      </div>
    </motion.div>
  );
}
