import { useState, useMemo } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import BadgeProjectSizeTier from "./BadgeProjectSizeTier";
import BadgeScarcityState from "./BadgeScarcityState";
import BadgePlanAccessState from "./BadgePlanAccessState";
import type { MatrixRow, PlanCode, ProjectSizeCode, ScarcityStatus } from "@/services/clusterProjectSizeMatrixEngine";

interface Props {
  rows: MatrixRow[];
}

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

export default function TableClusterPlanProjectSizeMatrix({ rows }: Props) {
  const [filterPlan, setFilterPlan] = useState<PlanCode | "all">("all");
  const [filterSize, setFilterSize] = useState<ProjectSizeCode | "all">("all");
  const [filterScarcity, setFilterScarcity] = useState<ScarcityStatus | "all">("all");

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterPlan !== "all" && r.plan !== filterPlan) return false;
      if (filterSize !== "all" && r.projectSize !== filterSize) return false;
      if (filterScarcity !== "all" && r.scarcityStatus !== filterScarcity) return false;
      return true;
    });
  }, [rows, filterPlan, filterSize, filterScarcity]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value as PlanCode | "all")} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground">
          <option value="all">Tous les plans</option>
          <option value="recrue">Recrue</option>
          <option value="pro">Pro</option>
          <option value="premium">Premium</option>
          <option value="elite">Élite</option>
          <option value="signature">Signature</option>
        </select>
        <select value={filterSize} onChange={e => setFilterSize(e.target.value as ProjectSizeCode | "all")} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground">
          <option value="all">Toutes tailles</option>
          <option value="xs">XS</option><option value="s">S</option><option value="m">M</option>
          <option value="l">L</option><option value="xl">XL</option><option value="xxl">XXL</option>
        </select>
        <select value={filterScarcity} onChange={e => setFilterScarcity(e.target.value as ScarcityStatus | "all")} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground">
          <option value="all">Toute rareté</option>
          <option value="open">Ouvert</option><option value="tight">Tension</option>
          <option value="rare">Rare</option><option value="full">Complet</option><option value="locked">Verrouillé</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Plan</TableHead>
              <TableHead className="text-xs">Taille</TableHead>
              <TableHead className="text-xs">Accès</TableHead>
              <TableHead className="text-xs text-right">Max</TableHead>
              <TableHead className="text-xs text-right">Occupé</TableHead>
              <TableHead className="text-xs text-right">Restant</TableHead>
              <TableHead className="text-xs">Rareté</TableHead>
              <TableHead className="text-xs text-right">Prix/mois</TableHead>
              <TableHead className="text-xs text-right">Revenu pot. /an</TableHead>
              <TableHead className="text-xs text-right">Gap /an</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r, i) => (
              <TableRow key={i} className={!r.accessAllowed ? "opacity-50" : ""}>
                <TableCell className="text-xs font-medium">{r.planName}</TableCell>
                <TableCell><BadgeProjectSizeTier size={r.projectSize} /></TableCell>
                <TableCell><BadgePlanAccessState allowed={r.accessAllowed} /></TableCell>
                <TableCell className="text-xs text-right font-mono">{r.maxSlots}</TableCell>
                <TableCell className="text-xs text-right font-mono">{r.currentSlots}</TableCell>
                <TableCell className="text-xs text-right font-mono">{r.remainingSlots}</TableCell>
                <TableCell><BadgeScarcityState status={r.scarcityStatus} /></TableCell>
                <TableCell className="text-xs text-right font-mono">{fmt(r.finalMonthlyPrice)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{fmt(r.revenueIfFullAnnual)}</TableCell>
                <TableCell className="text-xs text-right font-mono text-amber-400">{fmt(r.revenueGapAnnual)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} combinaisons affichées</p>
    </div>
  );
}
