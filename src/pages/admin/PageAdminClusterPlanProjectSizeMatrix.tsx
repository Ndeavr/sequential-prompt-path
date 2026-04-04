import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Grid3x3, TrendingUp, Lock, AlertTriangle, DollarSign, BarChart3 } from "lucide-react";
import TableClusterPlanProjectSizeMatrix from "@/components/project-size-matrix/TableClusterPlanProjectSizeMatrix";
import CardProjectSizeSummary from "@/components/project-size-matrix/CardProjectSizeSummary";
import BadgeScarcityState from "@/components/project-size-matrix/BadgeScarcityState";
import {
  generateLavalIsolationMock,
  getMatrixSummary,
  PROJECT_SIZES,
  computeUpgradePressureBySize,
} from "@/services/clusterProjectSizeMatrixEngine";
import type { MatrixRow } from "@/services/clusterProjectSizeMatrixEngine";

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

export default function PageAdminClusterPlanProjectSizeMatrix() {
  const rows = useMemo(() => generateLavalIsolationMock(), []);
  const summary = useMemo(() => getMatrixSummary(rows), [rows]);
  const pressureMessages = useMemo(() => computeUpgradePressureBySize(rows), [rows]);

  // Per-size aggregates
  const sizeAggregates = useMemo(() => {
    return PROJECT_SIZES.map(size => {
      const sizeRows = rows.filter(r => r.projectSize === size.code);
      return {
        size,
        slots: sizeRows.reduce((s, r) => s + r.maxSlots, 0),
        occupied: sizeRows.reduce((s, r) => s + r.currentSlots, 0),
        revenue: sizeRows.reduce((s, r) => s + r.revenueIfFullAnnual, 0),
      };
    });
  }, [rows]);

  return (
    <>
      <Helmet><title>Matrice Cluster × Plan × Taille | Admin UNPRO</title></Helmet>
      <div className="min-h-screen bg-background p-4 md:p-8 space-y-8">
        {/* Hero */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Grid3x3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Matrice Capacité × Taille de Projet</h1>
              <p className="text-sm text-muted-foreground">Cluster × Domaine × Plan × Project Size — Laval / Isolation</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={<DollarSign className="w-4 h-4" />} label="Revenu potentiel /an" value={fmt(summary.totalRevenueIfFull)} accent="text-emerald-400" />
          <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Gap de revenu /an" value={fmt(summary.totalGap)} accent="text-amber-400" />
          <KpiCard icon={<BarChart3 className="w-4 h-4" />} label="Occupation globale" value={`${summary.globalOccupancy}%`} accent="text-blue-400" />
          <KpiCard icon={<AlertTriangle className="w-4 h-4" />} label="Zones rares/pleines" value={String(summary.rareCount)} accent="text-orange-400" />
        </div>

        {/* Size Cards */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Capacité par taille</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {sizeAggregates.map(a => (
              <CardProjectSizeSummary key={a.size.code} size={a.size} slots={a.slots} occupied={a.occupied} revenue={a.revenue} />
            ))}
          </div>
        </div>

        {/* Upgrade Pressure */}
        {pressureMessages.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Pression d'upgrade</h2>
            <div className="space-y-2">
              {pressureMessages.map((msg, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-sm text-amber-300">{msg.text}</span>
                  {msg.targetPlan && <span className="ml-auto text-xs font-semibold text-amber-400">→ {msg.targetPlan}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Matrix Table */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Matrice complète</h2>
          <TableClusterPlanProjectSizeMatrix rows={rows} />
        </div>

        {/* Revenue by plan breakdown */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Revenu par plan (potentiel annuel)</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {(["recrue", "pro", "premium", "elite", "signature"] as const).map(plan => {
              const planRows = rows.filter(r => r.plan === plan);
              const total = planRows.reduce((s, r) => s + r.revenueIfFullAnnual, 0);
              const current = planRows.reduce((s, r) => s + r.revenueCurrentAnnual, 0);
              return (
                <div key={plan} className="rounded-xl border border-border bg-card p-4 space-y-1">
                  <p className="text-xs text-muted-foreground capitalize">{plan}</p>
                  <p className="text-lg font-bold text-foreground">{fmt(total)}</p>
                  <p className="text-xs text-muted-foreground">Actuel: {fmt(current)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
