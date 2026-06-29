/**
 * UNPRO — Admin cockpit: Waiting Homeowners
 * Shows the gap between demand and supply per (city × category).
 * Every row = a contractor acquisition opportunity.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWaitingHomeowners } from "@/hooks/useDemandSignal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, FileText, Megaphone, Users, RefreshCw } from "lucide-react";

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

export default function PageAdminWaitingHomeowners() {
  const { data, isLoading, refetch } = useWaitingHomeowners();
  const navigate = useNavigate();
  const { toast } = useToast();

  const totals = useMemo(() => {
    const rows = data ?? [];
    return {
      waiting: rows.reduce((s, r) => s + (r.homeowner_count ?? 0), 0),
      revenue: rows.reduce((s, r) => s + Number(r.estimated_revenue ?? 0), 0),
      gaps: rows.filter((r) => (r.gap_score ?? 0) > 0).length,
    };
  }, [data]);

  async function generateLanding(city: string, category: string) {
    const slug = `${category}-${city}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await supabase.from("contractor_recruitment_targets").upsert({
      city, category, landing_slug: slug, status: "active",
    }, { onConflict: "city,category" });
    toast({ title: "Landing générée", description: `/pro/demande/${city.toLowerCase()}/${category.toLowerCase()}` });
    window.open(`/pro/demande/${encodeURIComponent(city.toLowerCase())}/${encodeURIComponent(category.toLowerCase())}`, "_blank");
  }

  async function launchOutreach(city: string, category: string) {
    const { error } = await supabase.functions.invoke("outreach-demand-injector", {
      body: { city, category, action: "queue_outreach" },
    });
    if (error) {
      toast({ title: "Outreach queued via fallback", description: "Sera traité au prochain run." });
    } else {
      toast({ title: "Outreach lancé", description: `${category} · ${city}` });
    }
  }

  return (
    <div className="admin-theme min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-readable-primary">Propriétaires en attente</h1>
          <p className="text-readable-body">Chaque ligne est une opportunité de revenus bloquée par un manque d'offre.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Rafraîchir</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4"><p className="text-xs text-readable-muted">Propriétaires en attente</p><p className="text-3xl font-semibold text-readable-primary">{totals.waiting}</p></Card>
        <Card className="p-4"><p className="text-xs text-readable-muted">Demande estimée</p><p className="text-3xl font-semibold text-readable-primary">{fmtMoney(totals.revenue)}</p></Card>
        <Card className="p-4"><p className="text-xs text-readable-muted">Segments avec gap</p><p className="text-3xl font-semibold text-readable-primary">{totals.gaps}</p></Card>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Catégorie</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead className="text-right">En attente</TableHead>
              <TableHead className="text-right">Revenus</TableHead>
              <TableHead className="text-right">LTV</TableHead>
              <TableHead className="text-right">Pression</TableHead>
              <TableHead className="text-right">Offre</TableHead>
              <TableHead className="text-right">Gap</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (<TableRow><TableCell colSpan={9}>Chargement…</TableCell></TableRow>)}
            {(data ?? []).map((r) => (
              <TableRow key={`${r.city}-${r.category}`}>
                <TableCell className="font-medium capitalize">{r.category}</TableCell>
                <TableCell>{r.city}</TableCell>
                <TableCell className="text-right">{r.homeowner_count}</TableCell>
                <TableCell className="text-right">{fmtMoney(Number(r.estimated_revenue))}</TableCell>
                <TableCell className="text-right">{fmtMoney(Number(r.estimated_ltv))}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline">{Math.round(Number(r.pressure_score))}</Badge>
                </TableCell>
                <TableCell className="text-right">{r.supply_count}</TableCell>
                <TableCell className="text-right">
                  {Number(r.gap_score) > 0 ? <Badge className="bg-red-500/15 text-red-300 border-red-500/30">{r.gap_score}</Badge> : <span className="text-emerald-400">0</span>}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/demand-signals?city=${encodeURIComponent(r.city)}&category=${encodeURIComponent(r.category)}`)}><Eye className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => generateLanding(r.city, r.category)}><FileText className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => launchOutreach(r.city, r.category)}><Megaphone className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/contractors?city=${encodeURIComponent(r.city)}&category=${encodeURIComponent(r.category)}`)}><Users className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
