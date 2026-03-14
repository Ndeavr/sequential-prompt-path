/**
 * UNPRO — Score Teaser Card
 * Curiosity-driven card that shows a mini score preview and CTAs.
 * Used on homepage, public property pages, and city pages.
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ArrowRight, TrendingUp, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface ScoreTeaserProps {
  address?: string;
  score?: number | null;
  scoreType?: "estimated" | "enriched" | "certified";
  confidenceLabel?: string;
  city?: string;
  variant?: "hero" | "inline" | "compact";
  className?: string;
}

export function ScoreTeaser({
  address,
  score,
  scoreType = "estimated",
  confidenceLabel,
  city,
  variant = "inline",
  className = "",
}: ScoreTeaserProps) {
  const navigate = useNavigate();

  const scoreColor = !score ? "text-muted-foreground"
    : score >= 80 ? "text-success"
    : score >= 60 ? "text-accent"
    : score >= 40 ? "text-warning"
    : "text-destructive";

  if (variant === "compact") {
    return (
      <button
        onClick={() => navigate("/score-maison")}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all group ${className}`}
      >
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Score Maison gratuit</p>
          <p className="text-xs text-muted-foreground">Évaluez votre propriété en 30 secondes</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={className}
    >
      <Card className="border-border/50 shadow-[var(--shadow-lg)] overflow-hidden hover:shadow-[var(--shadow-xl)] transition-shadow">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            <div className="flex items-center justify-center p-5 bg-gradient-to-br from-primary/10 to-primary/5 min-w-[100px]">
              <div className="text-center">
                <span className={`font-display text-3xl font-bold ${scoreColor}`}>
                  {score ?? "?"}
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">/ 100</p>
              </div>
            </div>
            <div className="flex-1 p-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display text-sm font-semibold text-foreground">
                  {score ? "Score estimé" : "Score Maison"}
                </h3>
                {scoreType === "estimated" && (
                  <Badge variant="secondary" className="text-[10px]">Estimé</Badge>
                )}
              </div>
              {address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="h-3 w-3" /> {address}
                </p>
              )}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {score
                  ? "Plus d'informations améliorent la précision de votre score."
                  : "Entrez votre adresse pour obtenir une estimation gratuite."}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 text-primary p-0 h-auto text-xs font-semibold"
                onClick={() => navigate("/score-maison")}
              >
                {score ? "Améliorer mon score" : "Calculer mon score"} <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
