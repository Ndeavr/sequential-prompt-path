/**
 * DashMatchActivity — Recent match decisions and feedback
 */
import { motion } from "framer-motion";
import { Activity, CheckCircle2, XCircle, Star, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useContractorMatchDecisions, useContractorFeedback } from "@/hooks/useContractorDashboardData";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}

export default function DashMatchActivity() {
  const { data: decisions } = useContractorMatchDecisions();
  const { data: feedback } = useContractorFeedback();

  const recentDecisions = decisions?.slice(0, 5) ?? [];
  const recentFeedback = feedback?.slice(0, 3) ?? [];

  const acceptedCount = decisions?.filter(d => d.decision === "accepted").length ?? 0;
  const declinedCount = decisions?.filter(d => d.decision === "declined").length ?? 0;

  if (recentDecisions.length === 0 && recentFeedback.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-secondary" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Activité récente</span>
        </div>
        {decisions && decisions.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-success" /> {acceptedCount}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1">
              <XCircle className="w-2.5 h-2.5 text-destructive" /> {declinedCount}
            </Badge>
          </div>
        )}
      </div>

      {/* Match decisions */}
      {recentDecisions.length > 0 && (
        <div className="space-y-1">
          {recentDecisions.map((d: any) => (
            <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-colors">
              {d.decision === "accepted" ? (
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-foreground">
                  Lead {d.decision === "accepted" ? "accepté" : "décliné"}
                </p>
                {d.decline_reason && (
                  <p className="text-[9px] text-muted-foreground truncate">{d.decline_reason}</p>
                )}
              </div>
              <span className="text-[9px] text-muted-foreground flex-shrink-0">{timeAgo(d.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Client feedback */}
      {recentFeedback.length > 0 && (
        <div className="pt-2 border-t border-border/20 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Avis reçus</p>
          {recentFeedback.map((f: any) => (
            <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-colors">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < f.rating ? "text-warning fill-warning" : "text-muted-foreground/20"}`} />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                {f.comment && (
                  <p className="text-[10px] text-muted-foreground truncate">"{f.comment}"</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {f.was_on_time && <Badge variant="outline" className="text-[8px] h-4">Ponctuel</Badge>}
                {f.would_recommend && <Badge variant="outline" className="text-[8px] h-4">Recommandé</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
