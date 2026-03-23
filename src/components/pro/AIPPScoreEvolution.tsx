/**
 * UNPRO — AIPP Score Evolution Timeline
 * Shows score history over time with visual chart and milestone markers.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContractorProfile } from "@/hooks/useContractor";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";

interface ScoreSnapshot {
  id: string;
  overall_score: number;
  component_scores: Record<string, number> | null;
  calculated_at: string;
}

const useAIPPHistory = () => {
  const { data: profile } = useContractorProfile();
  return useQuery<ScoreSnapshot[]>({
    queryKey: ["aipp-history", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aipp_scores")
        .select("id, overall_score, component_scores, calculated_at")
        .eq("entity_id", profile!.id)
        .eq("entity_type", "contractor")
        .order("calculated_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ScoreSnapshot[];
    },
    enabled: !!profile?.id,
  });
};

const ScoreBar = ({ value, max, index, total }: { value: number; max: number; index: number; total: number }) => {
  const h = Math.max(8, (value / Math.max(max, 1)) * 80);
  const color = value >= 70 ? "bg-green-500" : value >= 50 ? "bg-amber-500" : value >= 30 ? "bg-orange-500" : "bg-red-500";
  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: `${h}px` }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`${color} rounded-t-sm w-full min-w-[6px] max-w-[16px]`}
      title={`${value}`}
    />
  );
};

export default function AIPPScoreEvolution() {
  const { data: history, isLoading } = useAIPPHistory();

  if (isLoading) return null;
  if (!history || history.length === 0) {
    return (
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Évolution du score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Votre historique de score apparaîtra ici après vos premières évaluations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const diff = previous ? latest.overall_score - previous.overall_score : 0;
  const maxScore = Math.max(...history.map(h => h.overall_score), 100);
  const minScore = Math.min(...history.map(h => h.overall_score));

  const trendIcon = diff > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : diff < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />;
  const trendColor = diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-muted-foreground";
  const trendBg = diff > 0 ? "bg-green-500/10 border-green-500/20" : diff < 0 ? "bg-red-500/10 border-red-500/20" : "bg-muted/30 border-border/40";

  // Find best score
  const best = Math.max(...history.map(h => h.overall_score));
  const bestDate = history.find(h => h.overall_score === best);

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Évolution du score
          </CardTitle>
          <Badge variant="outline" className={`text-xs ${trendBg} ${trendColor} border`}>
            {trendIcon}
            <span className="ml-1">{diff > 0 ? "+" : ""}{diff} pts</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini bar chart */}
        <div className="flex items-end gap-[2px] h-20 px-1">
          {history.map((s, i) => (
            <ScoreBar key={s.id} value={s.overall_score} max={maxScore} index={i} total={history.length} />
          ))}
        </div>

        {/* Date range */}
        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
          <span>{format(new Date(history[0].calculated_at), "d MMM yyyy", { locale: fr })}</span>
          <span>{format(new Date(latest.calculated_at), "d MMM yyyy", { locale: fr })}</span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold">{latest.overall_score}</p>
            <p className="text-[10px] text-muted-foreground">Actuel</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold text-green-400">{best}</p>
            <p className="text-[10px] text-muted-foreground">Meilleur</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-lg font-bold">{history.length}</p>
            <p className="text-[10px] text-muted-foreground">Évaluations</p>
          </div>
        </div>

        {/* Milestones */}
        {diff > 5 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20">
            <Zap className="h-4 w-4 text-green-400" />
            <p className="text-xs text-green-400">Progression notable : +{diff} points depuis la dernière évaluation</p>
          </div>
        )}
        {diff < -5 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <p className="text-xs text-red-400">Baisse de {Math.abs(diff)} points — vérifiez vos actions prioritaires</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
