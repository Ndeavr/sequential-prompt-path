/**
 * UNPRO — Admin Handoff Analytics
 * Overview of the handoff pipeline: requests, scores, match rates, follow-ups.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Inbox, Check, X, Clock, Zap } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) => (
  <Card>
    <CardContent className="py-4 px-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-muted ${color || ""}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/60">{sub}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

const PageAdminHandoffAnalytics = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-handoff-analytics"],
    queryFn: async () => {
      const [requests, handoffs, scores, matches] = await Promise.all([
        supabase.from("project_requests").select("id, status, created_at"),
        supabase.from("project_handoff").select("id, urgency_level"),
        supabase.from("lead_scores").select("id, score, label"),
        supabase.from("contractor_matches").select("id, status, responded_at, created_at"),
      ]);

      const allMatches = matches.data || [];
      const accepted = allMatches.filter(m => m.status === "accepted");
      const declined = allMatches.filter(m => m.status === "declined");
      const pending = allMatches.filter(m => m.status === "pending");

      const avgScore = (scores.data || []).length > 0
        ? Math.round((scores.data || []).reduce((s, r) => s + r.score, 0) / (scores.data || []).length)
        : 0;

      const avgResponseMs = accepted.filter(m => m.responded_at).map(m => {
        return new Date(m.responded_at!).getTime() - new Date(m.created_at).getTime();
      });
      const avgResponseMin = avgResponseMs.length > 0
        ? Math.round(avgResponseMs.reduce((a, b) => a + b, 0) / avgResponseMs.length / 60000)
        : 0;

      return {
        totalRequests: (requests.data || []).length,
        totalHandoffs: (handoffs.data || []).length,
        avgScore,
        totalMatches: allMatches.length,
        acceptedCount: accepted.length,
        declinedCount: declined.length,
        pendingCount: pending.length,
        acceptRate: allMatches.length > 0 ? Math.round((accepted.length / allMatches.length) * 100) : 0,
        avgResponseMin,
        scoreDistribution: {
          ELITE: (scores.data || []).filter(s => s.label === "ELITE").length,
          HIGH: (scores.data || []).filter(s => s.label === "HIGH").length,
          MEDIUM: (scores.data || []).filter(s => s.label === "MEDIUM").length,
          LOW: (scores.data || []).filter(s => s.label === "LOW").length,
        },
      };
    },
  });

  if (isLoading) return <div className="p-6"><LoadingState /></div>;
  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      <PageHeader title="Handoff Analytics" description="Pipeline Alex → Entrepreneur" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Inbox} label="Demandes" value={data.totalRequests} />
        <StatCard icon={Zap} label="Jobs structurés" value={data.totalHandoffs} color="text-primary" />
        <StatCard icon={TrendingUp} label="Score moyen" value={data.avgScore} sub="/100" />
        <StatCard icon={Clock} label="Réponse moy." value={`${data.avgResponseMin} min`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Matches" value={data.totalMatches} />
        <StatCard icon={Check} label="Acceptés" value={data.acceptedCount} color="text-green-400" />
        <StatCard icon={X} label="Refusés" value={data.declinedCount} color="text-destructive" />
        <StatCard icon={TrendingUp} label="Taux acceptation" value={`${data.acceptRate}%`} color="text-green-400" />
      </div>

      {/* Score distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Distribution des scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {Object.entries(data.scoreDistribution).map(([label, count]) => (
              <div key={label} className="flex-1 text-center">
                <Badge variant={label === "ELITE" ? "default" : "secondary"} className="text-xs mb-1">{label}</Badge>
                <p className="text-lg font-bold">{count as number}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PageAdminHandoffAnalytics;
