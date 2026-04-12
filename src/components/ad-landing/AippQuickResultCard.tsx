import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, AlertTriangle, TrendingUp, Zap, Globe, ExternalLink, ThumbsUp } from "lucide-react";
import type { AIPPQuickResult } from "@/services/aippQuickScoreService";

interface Props {
  result: AIPPQuickResult;
  businessName: string;
  city?: string;
  websiteUrl?: string;
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
        <span className="text-xs text-muted-foreground font-medium">AIPP</span>
      </div>
    </div>
  );
}

function VisibilityBadge({ label }: { label: string }) {
  const variant = label === "Dominant" || label === "Fort" ? "default" :
    label === "Présence correcte" ? "secondary" : "destructive";
  return (
    <Badge variant={variant} className="text-sm px-3 py-1">
      Visibilité IA : {label.toLowerCase()}
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

export default function AippQuickResultCard({ result, businessName, city, websiteUrl, onCreateProfile, onTalkToAlex }: Props) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      className="w-full max-w-md mx-auto space-y-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Screenshot preview card */}
      {result.screenshot && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="overflow-hidden border-primary/20">
            <div className="relative w-full bg-muted overflow-hidden rounded-t-lg">
              <img
                src={result.screenshot.startsWith("http") ? result.screenshot : `data:image/png;base64,${result.screenshot}`}
                alt={`Capture d'écran de ${businessName}`}
                className="w-full h-auto max-h-56 object-cover object-top"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-3 right-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-foreground drop-shadow-sm truncate">{businessName}</span>
                </div>
                {city && <span className="text-xs text-muted-foreground ml-6">{city}</span>}
              </div>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Votre site web analysé</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                  <a href={websiteUrl || "#"} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" /> Voir le site
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Score card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/5 p-6 text-center space-y-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Résultat pour
            </p>
            <h3 className="text-lg font-bold text-foreground">{businessName}</h3>
            <ScoreRing score={result.score} />
            <VisibilityBadge label={result.label} />
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
                <p className="text-xs font-bold text-foreground uppercase mb-2">Ce qui vous fait perdre des clients</p>
                <div className="space-y-1.5">
                  {result.quickWins.map((w) => (
                    <div key={w} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                      <span className="text-muted-foreground">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3 mt-5">
          <Button size="lg" className="w-full h-12 text-base font-bold" onClick={onCreateProfile}>
            Créer mon profil intelligent <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="w-full h-12 text-base" onClick={onTalkToAlex}>
            Continuer avec Alex
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
