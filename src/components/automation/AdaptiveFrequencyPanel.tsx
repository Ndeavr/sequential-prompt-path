import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, TrendingUp, TrendingDown, Pause, Target, Activity } from "lucide-react";
import {
  fetchAdaptiveScores,
  getActionLabel,
  getActionColor,
  getMultiplierBadgeClass,
  type AdaptiveFrequencyScore,
} from "@/services/adaptiveFrequencyService";

const actionIcons: Record<string, typeof Zap> = {
  accelerate: TrendingUp,
  maintain: Activity,
  decelerate: TrendingDown,
  pause: Pause,
  prioritize: Target,
};

function ScoreBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{value}</span>
      </div>
      <Progress value={value} className={`h-1.5 ${color}`} />
    </div>
  );
}

export default function AdaptiveFrequencyPanel() {
  const { data: scores = [], isLoading } = useQuery<AdaptiveFrequencyScore[]>({
    queryKey: ["adaptive-frequency-scores"],
    queryFn: () => fetchAdaptiveScores(50),
    staleTime: 30_000,
  });

  // Summary stats
  const accelerating = scores.filter(s => s.recommended_action === "accelerate").length;
  const decelerating = scores.filter(s => s.recommended_action === "decelerate" || s.recommended_action === "pause").length;
  const avgOpportunity = scores.length > 0
    ? Math.round(scores.reduce((s, c) => s + c.opportunity_score, 0) / scores.length)
    : 0;
  const topCluster = scores[0];

  const summaryItems = [
    { label: "Score moyen", value: avgOpportunity, icon: Target, color: "text-primary" },
    { label: "En accélération", value: accelerating, icon: TrendingUp, color: "text-emerald-500" },
    { label: "En décélération", value: decelerating, icon: TrendingDown, color: "text-amber-500" },
    { label: "Clusters actifs", value: scores.length, icon: Activity, color: "text-blue-500" },
  ];

  if (isLoading) {
    return <div className="flex justify-center py-12 text-sm text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryItems.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 shrink-0 ${color}`} />
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top opportunity */}
      {topCluster && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Cluster le plus prometteur
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{topCluster.cluster_key}</span>
              <Badge variant="outline" className="text-xs font-mono">
                Score: {topCluster.opportunity_score}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <ScoreBar value={topCluster.demand_score} label="Demande" color="" />
              <ScoreBar value={topCluster.supply_score} label="Offre" color="" />
              <ScoreBar value={topCluster.profitability_score} label="Rentabilité" color="" />
              <ScoreBar value={topCluster.content_quality_score} label="Qualité" color="" />
              <ScoreBar value={topCluster.seo_potential_score} label="SEO" color="" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scores table */}
      {scores.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 text-sm">
          Aucun score adaptatif calculé. Les scores seront générés automatiquement par les agents.
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Cluster</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Ville</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Catégorie</TableHead>
                <TableHead className="text-xs text-center">Opportunity</TableHead>
                <TableHead className="text-xs text-center">Multiplier</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map(s => {
                const ActionIcon = actionIcons[s.recommended_action ?? "maintain"] ?? Activity;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="p-2">
                      <p className="text-sm font-medium leading-tight truncate max-w-[180px]">{s.cluster_key}</p>
                      {s.agent_key && (
                        <p className="text-[10px] text-muted-foreground font-mono">{s.agent_key}</p>
                      )}
                    </TableCell>
                    <TableCell className="p-2 hidden sm:table-cell text-xs text-muted-foreground">
                      {s.city ?? "—"}
                    </TableCell>
                    <TableCell className="p-2 hidden md:table-cell text-xs text-muted-foreground">
                      {s.category ?? "—"}
                    </TableCell>
                    <TableCell className="p-2 text-center">
                      <span className={`text-sm font-bold ${
                        s.opportunity_score >= 70 ? "text-emerald-500" :
                        s.opportunity_score >= 40 ? "text-amber-500" : "text-destructive"
                      }`}>
                        {s.opportunity_score}
                      </span>
                    </TableCell>
                    <TableCell className="p-2 text-center">
                      <Badge variant="outline" className={`text-[10px] font-mono ${getMultiplierBadgeClass(s.frequency_multiplier)}`}>
                        ×{s.frequency_multiplier}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-2 hidden sm:table-cell">
                      <span className={`text-xs flex items-center gap-1 ${getActionColor(s.recommended_action ?? "maintain")}`}>
                        <ActionIcon className="h-3 w-3" />
                        {getActionLabel(s.recommended_action ?? "maintain")}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
