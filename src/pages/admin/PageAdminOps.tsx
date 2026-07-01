import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, AlertTriangle, CheckCircle2, HelpCircle, Loader2, PlayCircle,
  ShieldAlert, Wrench, ExternalLink,
} from "lucide-react";
import {
  useSystemChecks, useRepairJobs, useRunHealthCheck, useInvokeFunction,
  type SystemCheck,
} from "@/hooks/useAdminOps";
import { ADMIN_TOOLS, TOOLS_BY_CATEGORY } from "@/admin/adminToolsRegistry";

function StatusPill({ status }: { status: SystemCheck["status"] }) {
  const map = {
    healthy: { label: "Sain", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", Icon: CheckCircle2 },
    warning: { label: "Attention", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", Icon: AlertTriangle },
    critical: { label: "Critique", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30", Icon: ShieldAlert },
    unknown: { label: "Inconnu", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30", Icon: HelpCircle },
  }[status];
  const Icon = map.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${map.cls}`}>
      <Icon className="h-3 w-3" /> {map.label}
    </span>
  );
}

function RiskChip({ level }: { level: "safe" | "review" | "danger" }) {
  const map = {
    safe: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    review: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    danger: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  } as const;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${map[level]}`}>
      {level}
    </span>
  );
}

function severityScore(c: SystemCheck): number {
  const base = c.status === "critical" ? 1000 : c.status === "warning" ? 300 : c.status === "unknown" ? 100 : 0;
  return base + c.affected_count;
}

export default function PageAdminOps() {
  const checksQ = useSystemChecks();
  const jobsQ = useRepairJobs(25);
  const runHealth = useRunHealthCheck();
  const invoke = useInvokeFunction();

  const checks = checksQ.data ?? [];
  const jobs = jobsQ.data ?? [];

  const ranked = useMemo(
    () => [...checks].sort((a, b) => severityScore(b) - severityScore(a)).slice(0, 6),
    [checks],
  );

  return (
    <div className="admin-theme min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-readable-secondary text-sm">
              <Activity className="h-4 w-4" /> UNPRO Operations Center
            </div>
            <h1 className="text-3xl font-bold text-readable mt-1">Command Center</h1>
            <p className="text-readable-secondary mt-1">
              Un seul endroit pour voir ce qui est cassé, ce qui a été réparé et ce qu'il reste à faire.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => runHealth.mutate()} disabled={runHealth.isPending}>
              {runHealth.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              Lancer health check
            </Button>
          </div>
        </header>

        {/* Highest ROI actions */}
        <section>
          <h2 className="text-xl font-semibold text-readable mb-3">Actions à plus fort ROI</h2>
          <Card className="glass-strong">
            <CardContent className="p-0 divide-y divide-white/10">
              {checksQ.isLoading && (
                <div className="p-6 text-readable-secondary flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
                </div>
              )}
              {!checksQ.isLoading && ranked.length === 0 && (
                <div className="p-6 text-readable-secondary">
                  Aucun contrôle. Lancez un health check pour commencer.
                </div>
              )}
              {ranked.map((c, i) => (
                <div key={c.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="w-8 text-center text-readable-muted font-mono">{i + 1}</div>
                  <StatusPill status={c.status} />
                  <div className="flex-1 min-w-[240px]">
                    <div className="text-readable font-medium">{c.label}</div>
                    <div className="text-readable-secondary text-sm">
                      {c.affected_count} enregistrements — {c.recommended_action}
                    </div>
                  </div>
                  {c.repair_route && (
                    <Button asChild size="sm" variant="secondary">
                      <Link to={c.repair_route}>
                        Ouvrir <ExternalLink className="ml-2 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Health grid */}
        <section>
          <h2 className="text-xl font-semibold text-readable mb-3">Santé du système</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checks.map((c) => (
              <Card key={c.id} className="glass-strong">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base text-readable">{c.label}</CardTitle>
                    <StatusPill status={c.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-3xl font-semibold text-readable">{c.affected_count}</div>
                  <div className="text-xs text-readable-muted">
                    {c.last_checked_at ? `Vérifié: ${new Date(c.last_checked_at).toLocaleString("fr-CA")}` : "Jamais vérifié"}
                  </div>
                  <div className="text-sm text-readable-secondary">{c.recommended_action}</div>
                  {c.repair_route && (
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link to={c.repair_route}>Ouvrir l'outil <ExternalLink className="ml-2 h-3 w-3" /></Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Automated jobs */}
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-xl font-semibold text-readable">Jobs automatisés</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={invoke.isPending}
                onClick={() => invoke.mutate({ name: "acq-normalize-repair", body: { dry_run: true, sample_size: 20 } })}>
                <Wrench className="mr-2 h-3 w-3" /> Normalisation dry-run
              </Button>
              <Button size="sm" variant="secondary" disabled={invoke.isPending}
                onClick={() => invoke.mutate({ name: "acq-normalize-repair", body: { dry_run: false, sample_size: 20 } })}>
                <ShieldAlert className="mr-2 h-3 w-3" /> Appliquer fixes sûrs
              </Button>
              <Button size="sm" variant="secondary" disabled={invoke.isPending}
                onClick={() => invoke.mutate({ name: "acq-validation-audit", body: {} })}>
                Revalider téléphones
              </Button>
              <Button size="sm" variant="secondary" disabled={invoke.isPending}
                onClick={() => invoke.mutate({ name: "acq-recovery-report", body: {} })}>
                Rapport recovery
              </Button>
            </div>
          </div>
          <Card className="glass-strong">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-readable-muted border-b border-white/10">
                    <th className="py-2 px-3">Job</th>
                    <th className="py-2 px-3">Statut</th>
                    <th className="py-2 px-3">Risque</th>
                    <th className="py-2 px-3">Affectés</th>
                    <th className="py-2 px-3">Créé</th>
                    <th className="py-2 px-3">Appliqué</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 && (
                    <tr><td colSpan={6} className="p-4 text-readable-secondary text-center">Aucun job</td></tr>
                  )}
                  {jobs.map((j) => (
                    <tr key={j.id} className="border-b border-white/5">
                      <td className="py-2 px-3 text-readable font-mono text-xs">{j.job_type}</td>
                      <td className="py-2 px-3 text-readable-secondary">{j.status}</td>
                      <td className="py-2 px-3"><RiskChip level={j.risk_level} /></td>
                      <td className="py-2 px-3 text-readable">{j.affected_count}</td>
                      <td className="py-2 px-3 text-readable-muted">{new Date(j.created_at).toLocaleString("fr-CA")}</td>
                      <td className="py-2 px-3 text-readable-muted">{j.applied_at ? new Date(j.applied_at).toLocaleString("fr-CA") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        {/* All tools */}
        <section>
          <h2 className="text-xl font-semibold text-readable mb-3">Répertoire complet des outils</h2>
          <div className="space-y-4">
            {Object.entries(TOOLS_BY_CATEGORY).map(([cat, tools]) => (
              <Card key={cat} className="glass-strong">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm uppercase tracking-wide text-readable-secondary">{cat}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tools.map((t) => (
                      <Link key={t.id} to={t.route}
                        className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-readable font-medium">{t.label}</div>
                          <RiskChip level={t.risk_level} />
                        </div>
                        <div className="text-readable-secondary text-sm mt-1">{t.description}</div>
                        <div className="text-readable-muted text-xs mt-2 font-mono">{t.route}</div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="text-readable-muted text-xs text-center">
              {ADMIN_TOOLS.length} outils enregistrés dans <code>adminToolsRegistry.ts</code>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
