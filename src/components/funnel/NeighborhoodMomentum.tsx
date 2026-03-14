/**
 * UNPRO — Neighborhood Momentum Card
 * Privacy-safe social proof showing anonymized area trends.
 * No individual property or owner information is ever exposed.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Award, Leaf, Home, Shield } from "lucide-react";
import { motion } from "framer-motion";
import type { NeighborhoodStats } from "@/services/property/neighborhoodService";

interface NeighborhoodMomentumProps {
  stats: NeighborhoodStats | null;
  city: string;
  yourScore?: number | null;
  variant?: "full" | "compact";
  className?: string;
}

interface TrendItem {
  icon: React.ElementType;
  text: string;
  emphasis?: boolean;
}

function generateTrends(stats: NeighborhoodStats): TrendItem[] {
  const trends: TrendItem[] = [];

  if (stats.activePassports > 2) {
    trends.push({
      icon: Home,
      text: `${stats.activePassports} propriétaires ont complété leur passeport dans ce secteur`,
    });
  }

  if (stats.recentImprovements > 0) {
    trends.push({
      icon: TrendingUp,
      text: `${stats.recentImprovements} améliorations documentées récemment à proximité`,
      emphasis: true,
    });
  }

  if (stats.topRenovationTypes.length > 0) {
    const topTypes = stats.topRenovationTypes.slice(0, 2).join(" et ");
    trends.push({
      icon: Leaf,
      text: `Tendance locale : ${topTypes}`,
    });
  }

  if (stats.avgScore && stats.avgScore > 0) {
    trends.push({
      icon: Shield,
      text: `Score moyen du secteur : ${Math.round(stats.avgScore)}/100`,
    });
  }

  if (stats.propertyCount >= 10) {
    trends.push({
      icon: Users,
      text: `${stats.propertyCount} propriétés documentées dans ce secteur`,
    });
  }

  return trends;
}

export function NeighborhoodMomentum({
  stats,
  city,
  yourScore,
  variant = "full",
  className = "",
}: NeighborhoodMomentumProps) {
  if (!stats || stats.propertyCount < 3) return null;

  const trends = generateTrends(stats);
  if (trends.length === 0) return null;

  const areaLabel = stats.neighborhood || city;
  const delta = yourScore && stats.avgScore ? yourScore - stats.avgScore : null;

  if (variant === "compact") {
    return (
      <div className={`space-y-2 ${className}`}>
        {trends.slice(0, 2).map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
            <t.icon className="h-3.5 w-3.5 text-primary/60 shrink-0" />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={className}
    >
      <Card className="border-border/50 shadow-[var(--shadow-md)]">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                Dynamique du secteur
              </h3>
            </div>
            <Badge variant="outline" className="text-[10px]">{areaLabel}</Badge>
          </div>

          {/* Score comparison bar */}
          {yourScore && stats.avgScore && (
            <div className="mb-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Votre score</span>
                <span className="font-semibold text-foreground">{yourScore}/100</span>
              </div>
              <div className="relative h-2 rounded-full bg-border/60 overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(yourScore, 100)}%` }}
                />
                {stats.avgScore > 0 && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-foreground/40"
                    style={{ left: `${Math.min(stats.avgScore, 100)}%` }}
                    title={`Moyenne: ${Math.round(stats.avgScore)}`}
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] mt-1">
                <span className="text-muted-foreground">Moyenne secteur: {Math.round(stats.avgScore)}</span>
                {delta !== null && (
                  <span className={delta >= 0 ? "text-success font-semibold" : "text-warning font-semibold"}>
                    {delta >= 0 ? "+" : ""}{Math.round(delta)} pts
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Trend items */}
          <div className="space-y-2.5">
            {trends.map((t, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 text-xs ${t.emphasis ? "text-foreground font-medium" : "text-muted-foreground"}`}
              >
                <t.icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${t.emphasis ? "text-primary" : "text-muted-foreground/60"}`} />
                <span className="leading-relaxed">{t.text}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground/60 mt-3 pt-2 border-t border-border/30">
            Données agrégées et anonymisées. Aucune information individuelle n'est partagée.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
