/**
 * UNPRO — AI Optimization Panel (Admin)
 */
import { motion } from "framer-motion";
import { Brain, CheckCircle2, XCircle, Clock, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiOptimizationLogs, useAiRecommendations, useUpdateRecommendation } from "@/hooks/useDynamicPricing";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function AiOptimizationPanel() {
  const { data: logs } = useAiOptimizationLogs(15);
  const { data: recommendations } = useAiRecommendations();
  const updateRec = useUpdateRecommendation();

  const pending = (recommendations ?? []).filter((r: any) => r.status === "pending");
  const applied = (logs ?? []).filter((l: any) => l.applied);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Recommandations", value: String(recommendations?.length ?? 0), icon: Brain, color: "text-primary" },
          { label: "En attente", value: String(pending.length), icon: Clock, color: "text-warning" },
          { label: "Auto-ajustements", value: String(applied.length), icon: Zap, color: "text-success" },
          { label: "Logs totaux", value: String(logs?.length ?? 0), icon: AlertTriangle, color: "text-accent" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-3.5 text-center">
            <kpi.icon className={`w-4 h-4 mx-auto mb-1.5 ${kpi.color}`} />
            <p className="text-lg font-bold font-display text-foreground">{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Pending Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Recommandations IA</h2>
        </div>

        {!recommendations?.length ? (
          <p className="text-xs text-muted-foreground">Aucune recommandation</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {recommendations.map((r: any) => (
              <div
                key={r.id}
                className={`rounded-xl border p-4 space-y-2 ${
                  r.status === "pending"
                    ? "border-warning/30 bg-warning/5"
                    : r.status === "approved"
                    ? "border-success/30 bg-success/5"
                    : "border-border/20 bg-muted/5"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        r.priority === "critical" ? "bg-destructive/15 text-destructive" :
                        r.priority === "high" ? "bg-warning/15 text-warning" :
                        "bg-muted/20 text-muted-foreground"
                      }`}>
                        {r.priority}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-muted/15 text-muted-foreground">
                        {r.recommendation_type}
                      </span>
                      {r.status !== "pending" && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          r.status === "approved" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                        }`}>
                          {r.status === "approved" ? "Approuvé" : "Rejeté"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-foreground">{r.title_fr}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{r.description_fr}</p>
                    {r.expected_impact_fr && (
                      <p className="text-[10px] text-primary mt-1">Impact: {r.expected_impact_fr}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground/60">
                        Confiance: {Math.round(r.confidence_score * 100)}%
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>

                {r.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] border-success/30 text-success hover:bg-success/10"
                      onClick={() => updateRec.mutate({ id: r.id, status: "approved" })}
                      disabled={updateRec.isPending}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => updateRec.mutate({ id: r.id, status: "rejected" })}
                      disabled={updateRec.isPending}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Rejeter
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Optimization Logs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-accent" />
          <h2 className="font-display text-sm font-semibold text-foreground">Journal d'optimisation</h2>
        </div>

        {!logs?.length ? (
          <p className="text-xs text-muted-foreground">Aucun log</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {logs.map((l: any) => (
              <div key={l.id} className="rounded-lg bg-muted/10 border border-border/20 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-accent/10 text-accent">
                      {l.optimization_type}
                    </span>
                    {l.applied && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-success/10 text-success">
                        Appliqué
                      </span>
                    )}
                    {l.rolled_back && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-destructive/10 text-destructive">
                        Annulé
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                <p className="text-xs text-foreground">{l.change_description}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{l.reason}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
