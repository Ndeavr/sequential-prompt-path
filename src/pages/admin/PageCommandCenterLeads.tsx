/**
 * UNPRO — Command Center Leads Sub-Page
 */
import { useState, useMemo } from "react";
import { useCommandCenterData } from "@/hooks/useCommandCenterData";
import TopCommandBar from "@/components/command-center/TopCommandBar";
import { SniperTargetDrawer } from "@/components/sniper/SniperTargetDrawer";
import { SniperBulkActions } from "@/components/sniper/SniperBulkActions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getHeatLabelFr, getHeatColor, getActionLabelFr, PIPELINE_STAGES } from "@/services/dynamicPricingEngine";

export default function PageCommandCenterLeads() {
  const { viewModel, loading, filters, setFilters, refresh, cities, categories } = useCommandCenterData();
  const [drawerTargetId, setDrawerTargetId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState("all");

  const leads = useMemo(() => {
    let all = [...viewModel.hotLeads, ...viewModel.pipeline.flatMap(c => c.leads)];
    // Dedupe
    const seen = new Set<string>();
    all = all.filter(l => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
    if (stageFilter !== "all") all = all.filter(l => l.stage === stageFilter);
    return all;
  }, [viewModel, stageFilter]);

  return (
    <div className="min-h-screen bg-background p-3 lg:p-6 space-y-4">
      <TopCommandBar filters={filters} onFiltersChange={setFilters} cities={cities} categories={categories} onRefresh={refresh} />

      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">Tous les leads</h2>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {PIPELINE_STAGES.map(s => <SelectItem key={s.stage} value={s.stage}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs">{leads.length} résultats</Badge>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Chargement…</div>
      ) : (
        <div className="rounded-xl border border-border/20 bg-card/20 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[10px] uppercase">
                <TableHead>Entreprise</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Heat</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Fondateur</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map(l => (
                <TableRow key={l.id} className="text-xs cursor-pointer hover:bg-muted/10" onClick={() => setDrawerTargetId(l.id)}>
                  <TableCell className="font-medium">{l.businessName}</TableCell>
                  <TableCell>{l.city || "—"}</TableCell>
                  <TableCell>{l.category || "—"}</TableCell>
                  <TableCell>{l.sniperPriorityScore != null ? Math.round(l.sniperPriorityScore) : "—"}</TableCell>
                  <TableCell><span className={getHeatColor(l.heatLevel)}>{getHeatLabelFr(l.heatLevel)}</span></TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px]">{l.stage}</Badge></TableCell>
                  <TableCell>{l.founderEligible ? "✓" : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px]">{getActionLabelFr(l.recommendedAction)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SniperTargetDrawer targetId={drawerTargetId} open={!!drawerTargetId} onClose={() => setDrawerTargetId(null)} onRefresh={refresh} />
    </div>
  );
}
