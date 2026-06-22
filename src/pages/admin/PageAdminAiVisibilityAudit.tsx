/**
 * AI Visibility Audit Cockpit — runs all 10 phases, surfaces Top 20 findings by revenue impact.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Play, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";

interface Finding {
  id: string;
  phase: string;
  route: string | null;
  severity: string;
  score: number | null;
  auto_repairable: boolean;
  repair_status: string;
  estimated_conversion_lift_pct: number | null;
  estimated_revenue_impact_cad: number | null;
  recommended_action: string | null;
  payload: any;
}

interface Run {
  id: string;
  status: string;
  finished_at: string | null;
  summary: any;
  started_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-600",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
};

export default function PageAdminAiVisibilityAudit() {
  const [running, setRunning] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [lastRun, setLastRun] = useState<Run | null>(null);

  async function loadData() {
    const { data: runs } = await supabase
      .from("ai_visibility_runs" as any)
      .select("*").order("started_at", { ascending: false }).limit(1);
    if (runs && runs.length) setLastRun(runs[0] as any);

    const { data: f } = await supabase
      .from("ai_visibility_findings" as any)
      .select("*")
      .eq("repair_status", "pending")
      .order("estimated_revenue_impact_cad", { ascending: false })
      .limit(20);
    setFindings((f || []) as any);
  }

  useEffect(() => { loadData(); }, []);

  async function runAudit() {
    setRunning(true);
    toast.info("Lancement de l'audit complet (10 phases)…");
    try {
      const { data, error } = await supabase.functions.invoke("ai-visibility-orchestrator", {
        body: { phases: ["all"] },
      });
      if (error) throw error;
      toast.success(`Audit terminé : ${data.summary.total} constats, impact estimé ${Math.round(data.summary.total_revenue_impact_cad).toLocaleString()} $`);
      await loadData();
    } catch (e: any) {
      toast.error("Échec de l'audit : " + e.message);
    } finally {
      setRunning(false);
    }
  }

  async function markFixed(id: string) {
    await supabase.from("ai_visibility_findings" as any)
      .update({ repair_status: "fixed" }).eq("id", id);
    await loadData();
  }

  const totalImpact = findings.reduce((s, f) => s + (f.estimated_revenue_impact_cad || 0), 0);
  const autoCount = findings.filter(f => f.auto_repairable).length;

  return (
    <div className="alex-immersive min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-readable">AI Visibility Audit</h1>
          <p className="text-readable-secondary mt-1">10 phases · GEO · AEO · Entity dominance · Revenue ranking</p>
        </div>
        <Button onClick={runAudit} disabled={running} size="lg" className="gap-2">
          {running ? <Loader2 className="animate-spin" /> : <Play />} Lancer l'audit complet
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-strong p-4">
          <div className="text-sm text-readable-secondary">Constats actifs</div>
          <div className="text-2xl font-bold text-readable">{findings.length}</div>
        </Card>
        <Card className="glass-strong p-4">
          <div className="text-sm text-readable-secondary">Auto-réparables</div>
          <div className="text-2xl font-bold text-green-400">{autoCount}</div>
        </Card>
        <Card className="glass-strong p-4">
          <div className="text-sm text-readable-secondary">Impact revenu estimé</div>
          <div className="text-2xl font-bold text-readable">{Math.round(totalImpact).toLocaleString()} $</div>
        </Card>
        <Card className="glass-strong p-4">
          <div className="text-sm text-readable-secondary">Dernier run</div>
          <div className="text-sm text-readable">{lastRun ? new Date(lastRun.started_at).toLocaleString("fr-CA") : "—"}</div>
          <div className="text-xs text-readable-muted">{lastRun?.status || ""}</div>
        </Card>
      </div>

      <Card className="glass-strong p-6">
        <h2 className="text-xl font-semibold text-readable mb-4 flex items-center gap-2">
          <TrendingUp className="text-orange-400" /> TOP 20 — Triés par impact revenu
        </h2>
        {findings.length === 0 ? (
          <div className="text-center py-12 text-readable-secondary">
            Aucun constat. Lancez l'audit pour commencer.
          </div>
        ) : (
          <div className="space-y-3">
            {findings.map((f, i) => (
              <div key={f.id} className="flex items-start gap-3 p-4 rounded-lg bg-white/[0.02] border border-white/10">
                <div className="text-readable-muted font-mono w-6">{i + 1}</div>
                <Badge className={`${SEVERITY_COLORS[f.severity] || "bg-gray-500"} text-white shrink-0`}>
                  {f.severity}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-readable font-medium">{f.recommended_action}</div>
                  <div className="text-xs text-readable-muted mt-1 flex gap-3">
                    <span>phase: {f.phase}</span>
                    {f.route && <span>route: {f.route}</span>}
                    {f.score !== null && <span>score: {f.score}/100</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-readable font-semibold">
                    {Math.round(f.estimated_revenue_impact_cad || 0).toLocaleString()} $
                  </div>
                  <div className="text-xs text-readable-muted">
                    +{f.estimated_conversion_lift_pct || 0}% conv.
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {f.auto_repairable && (
                    <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Auto
                    </Badge>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => markFixed(f.id)} className="text-xs">
                    Marquer corrigé
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {lastRun?.summary?.by_phase && (
        <Card className="glass-strong p-6">
          <h2 className="text-lg font-semibold text-readable mb-3 flex items-center gap-2">
            <AlertTriangle className="text-yellow-400" /> Résumé par phase
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(lastRun.summary.by_phase as Record<string, number>).map(([phase, count]) => (
              <div key={phase} className="p-3 rounded bg-white/[0.03]">
                <div className="text-xs text-readable-muted">{phase}</div>
                <div className="text-xl font-bold text-readable">{count}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
