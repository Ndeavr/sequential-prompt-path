/**
 * UNPRO — Admin Plan Distribution Page
 * Full dashboard for plan capacity, scarcity, and distribution management.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, Shield, TrendingUp, Layers, AlertTriangle } from "lucide-react";
import { loadPlanDefinitions, loadClusterCapacities, loadClusterPricing, computeClusterRevenue } from "@/services/planCapacityEngine";
import type { DistributionProfile, ClusterValueTier } from "@/services/planCapacityEngine";
import TablePlanCapacity from "@/components/pricing/TablePlanCapacity";
import PanelPlanDistribution from "@/components/pricing/PanelPlanDistribution";
import BadgePlanScarcity from "@/components/pricing/BadgePlanScarcity";

export default function PageAdminPlanDistribution() {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  const { data: plans = [] } = useQuery({
    queryKey: ["plan-definitions"],
    queryFn: loadPlanDefinitions,
  });

  const { data: capacities = [] } = useQuery({
    queryKey: ["cluster-capacities"],
    queryFn: () => loadClusterCapacities(),
  });

  const { data: pricingList = [] } = useQuery({
    queryKey: ["cluster-pricing"],
    queryFn: () => loadClusterPricing(),
  });

  // Unique clusters
  const clusters = [...new Set(capacities.map(c => c.cluster_key))].sort();
  const filteredCaps = selectedCluster
    ? capacities.filter(c => c.cluster_key === selectedCluster)
    : capacities;

  const clusterPricing = pricingList.find(p => p.cluster_key === selectedCluster);
  const valueTier: ClusterValueTier = (clusterPricing?.cluster_value_tier as ClusterValueTier) ?? "medium";

  // Aggregate stats
  const totalSlots = capacities.reduce((s, c) => s + c.max_slots, 0);
  const totalOccupied = capacities.reduce((s, c) => s + c.occupied_slots, 0);
  const rareClusters = clusters.filter(ck =>
    capacities.filter(c => c.cluster_key === ck).some(c => c.scarcity_status === "rare" || c.scarcity_status === "full")
  ).length;

  const revenue = selectedCluster && filteredCaps.length > 0
    ? computeClusterRevenue(filteredCaps, plans, valueTier)
    : null;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <main className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="font-display text-xl font-bold text-foreground">Distribution des plans</h1>
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">Admin</span>
            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-semibold">No Free</span>
          </div>
          <p className="text-sm text-muted-foreground">Capacité, rareté et allocation par cluster — 100% monétisé</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Slots totaux", value: totalSlots, icon: Layers, color: "text-primary" },
            { label: "Occupés", value: totalOccupied, icon: BarChart3, color: "text-emerald-400" },
            { label: "Taux", value: totalSlots > 0 ? `${Math.round((totalOccupied / totalSlots) * 100)}%` : "—", icon: TrendingUp, color: "text-amber-400" },
            { label: "Clusters rares", value: rareClusters, icon: AlertTriangle, color: "text-orange-400" },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl border border-border/30 bg-card/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Cluster selector */}
        {clusters.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setSelectedCluster(null)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap border ${
                !selectedCluster ? "bg-primary/15 text-primary border-primary/20" : "text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/20"
              }`}
            >
              Tous
            </button>
            {clusters.map(ck => (
              <button
                key={ck}
                onClick={() => setSelectedCluster(ck)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap border ${
                  selectedCluster === ck ? "bg-primary/15 text-primary border-primary/20" : "text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/20"
                }`}
              >
                {ck}
              </button>
            ))}
          </div>
        )}

        <motion.div key={selectedCluster ?? "all"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-5">
          {/* Distribution Panel */}
          <PanelPlanDistribution maxContractors={selectedCluster ? filteredCaps.reduce((s, c) => s + c.max_slots, 0) || 220 : totalSlots || 220} />

          {/* Capacity Table */}
          {filteredCaps.length > 0 ? (
            <TablePlanCapacity capacities={filteredCaps} plans={plans} valueTier={valueTier} />
          ) : (
            <div className="rounded-xl border border-border/30 bg-card/50 p-8 text-center">
              <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {clusters.length === 0
                  ? "Aucun cluster configuré. Ajoutez des données de capacité pour commencer."
                  : "Sélectionnez un cluster pour voir la distribution."}
              </p>
            </div>
          )}

          {/* Revenue Panel */}
          {revenue && (
            <div className="rounded-xl border border-border/30 bg-card/50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-sm">Revenus projetés — {selectedCluster}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <p className="text-[10px] text-muted-foreground">Mensuel</p>
                  <p className="text-lg font-bold text-emerald-400 font-mono">{(revenue.monthly / 100).toLocaleString("fr-CA")} $</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <p className="text-[10px] text-muted-foreground">Annuel</p>
                  <p className="text-lg font-bold text-emerald-400 font-mono">{(revenue.annual / 100).toLocaleString("fr-CA")} $</p>
                </div>
              </div>
            </div>
          )}

          {/* Rules reminder */}
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-400">Règles bloquantes actives</p>
                <ul className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                  <li>• Aucun accès gratuit — paiement obligatoire</li>
                  <li>• Pas de downgrade si le plan cible est plein</li>
                  <li>• Cluster full = inscription bloquée + waitlist</li>
                  <li>• Signature peut verrouiller un cluster</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
