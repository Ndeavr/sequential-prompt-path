/**
 * Response Time Widget — Shows average response time to appointment requests
 */
import { motion } from "framer-motion";
import { Clock, TrendingDown, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContractorProfile } from "@/hooks/useContractor";

export default function DashResponseTime() {
  const { data: profile } = useContractorProfile();

  const { data: avgMinutes } = useQuery({
    queryKey: ["contractor-response-time", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("created_at, updated_at, status")
        .eq("contractor_id", profile!.id)
        .in("status", ["accepted", "scheduled", "completed"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (error || !data || data.length === 0) return null;

      const diffs = data
        .filter(a => a.updated_at && a.created_at)
        .map(a => (new Date(a.updated_at!).getTime() - new Date(a.created_at).getTime()) / 60000)
        .filter(d => d > 0 && d < 10080); // cap at 1 week

      if (diffs.length === 0) return null;
      return Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length);
    },
    enabled: !!profile?.id,
  });

  const label = avgMinutes == null
    ? "—"
    : avgMinutes < 60
      ? `${avgMinutes} min`
      : avgMinutes < 1440
        ? `${Math.round(avgMinutes / 60)}h`
        : `${Math.round(avgMinutes / 1440)}j`;

  const quality = avgMinutes == null
    ? "neutral"
    : avgMinutes <= 30
      ? "excellent"
      : avgMinutes <= 120
        ? "good"
        : avgMinutes <= 720
          ? "average"
          : "slow";

  const qualityLabel = {
    excellent: "Excellent",
    good: "Bon",
    average: "À améliorer",
    slow: "Trop lent",
    neutral: "—",
  }[quality];

  const qualityColor = {
    excellent: "text-success",
    good: "text-primary",
    average: "text-warning",
    slow: "text-destructive",
    neutral: "text-muted-foreground",
  }[quality];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.52 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Temps de réponse moyen</span>
            <span className={`text-[10px] font-bold ${qualityColor}`}>{qualityLabel}</span>
          </div>
          <p className="text-xl font-bold text-foreground mt-0.5">{label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {quality === "excellent"
              ? "Les pros les plus rapides convertissent 3x plus."
              : quality === "slow"
                ? "Répondez plus vite pour ne pas perdre de rendez-vous."
                : "Temps mesuré sur vos 20 derniers rendez-vous acceptés."
            }
          </p>
        </div>
      </div>
    </motion.div>
  );
}