import AdminLayout from "@/layouts/AdminLayout";
import { Suspense } from "react";
import { Shield, CheckCircle2, XCircle, Activity, Zap, FlaskConical, Bot, ScrollText, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CardQuickAccess from "@/components/admin/outbound-ops/CardQuickAccess";
import BadgePipelineState from "@/components/admin/outbound-ops/BadgePipelineState";
import { usePipelineHealth, useAutomationJobs, useVerificationRuns } from "@/hooks/useOutboundOpsData";

export default function PageOutboundOpsCenter() {
  const { data: health } = usePipelineHealth();
  const { data: jobs } = useAutomationJobs(5);
  const { data: runs } = useVerificationRuns(5);

  const activeJobs = jobs?.filter(j => j.status === "running" || j.status === "queued").length || 0;
  const lastSuccess = runs?.find(r => r.status === "completed");
  const lastFailure = runs?.find(r => r.status === "failed");

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10"><Shield className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-display">Centre d'opérations Outbound</h1>
            <p className="text-sm text-muted-foreground">Vérification, tests, automations et logs du pipeline</p>
          </div>
        </div>
      </div>

      {/* Global Health */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Pipeline</p>
          <BadgePipelineState state={health?.global_health || "unknown"} />
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Dernier succès</p>
          <p className="text-sm font-medium">{lastSuccess ? new Date(lastSuccess.created_at).toLocaleDateString("fr-CA") : "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Dernier échec</p>
          <p className="text-sm font-medium text-red-400">{lastFailure ? new Date(lastFailure.created_at).toLocaleDateString("fr-CA") : "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Jobs actifs</p>
          <p className="text-lg font-bold">{activeJobs}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Dry-run</p>
          <BadgePipelineState state="healthy" />
        </CardContent></Card>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Accès rapide</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <CardQuickAccess title="Vérification" summary="Auditer chaque étape du pipeline" status={health?.global_health || "unknown"} icon={CheckCircle2} href="/admin/outbound/verification" ctaLabel="Vérifier" />
          <CardQuickAccess title="Tests manuels" summary="Lancer des scénarios de test" status="healthy" icon={FlaskConical} href="/admin/outbound/tests" ctaLabel="Tester" />
          <CardQuickAccess title="Automations" summary="Contrôler les jobs batch" status={activeJobs > 0 ? "running" : "healthy"} icon={Bot} href="/admin/outbound/automations" ctaLabel="Gérer" />
          <CardQuickAccess title="Logs" summary="Visualiser les événements pipeline" status="healthy" icon={ScrollText} href="/admin/outbound/logs" ctaLabel="Voir logs" />
        </div>
      </div>

      {/* Recent runs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Dernières vérifications</CardTitle>
        </CardHeader>
        <CardContent>
          {(!runs || runs.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune vérification lancée</p>
          ) : (
            <div className="space-y-2">
              {runs.slice(0, 5).map(run => (
                <div key={run.id} className="flex items-center justify-between text-sm border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <BadgePipelineState state={run.status} />
                    <span className="text-muted-foreground">{run.run_type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="text-emerald-400">{run.success_count}✓</span>
                    <span className="text-red-400">{run.failure_count}✗</span>
                    <span>{new Date(run.created_at).toLocaleString("fr-CA")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
