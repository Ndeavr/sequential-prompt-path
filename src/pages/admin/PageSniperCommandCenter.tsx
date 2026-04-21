/**
 * UNPRO — Sniper Sales Command Center
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Flame, TrendingUp, Users, Send, Eye, CheckCircle2 } from "lucide-react";
import { getHeatLabel } from "@/services/planRecommendationService";
import { SniperCsvImport } from "@/components/sniper/SniperCsvImport";
import { SniperTerritoryGaps } from "@/components/sniper/SniperTerritoryGaps";
import { SniperRepQueue } from "@/components/sniper/SniperRepQueue";
import { SniperBulkActions } from "@/components/sniper/SniperBulkActions";
import { SniperTargetDrawer } from "@/components/sniper/SniperTargetDrawer";

export default function PageSniperCommandCenter() {
  const [targets, setTargets] = useState<any[]>([]);
  const [stats, setStats] = useState({ imported: 0, enriched: 0, pageReady: 0, sent: 0, engaged: 0, auditStarted: 0, converted: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [drawerTargetId, setDrawerTargetId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase.from("sniper_targets" as any).select("*").order("heat_score", { ascending: false }).limit(200);
    const rows = (data || []) as any[];
    setTargets(rows);
    setStats({
      imported: rows.length,
      enriched: rows.filter((r: any) => r.enrichment_status === "enriched").length,
      pageReady: rows.filter((r: any) => ["page_ready", "message_ready"].includes(r.outreach_status)).length,
      sent: rows.filter((r: any) => ["sent", "engaged", "audit_started", "audit_completed", "checkout_started", "converted"].includes(r.outreach_status)).length,
      engaged: rows.filter((r: any) => ["engaged", "audit_started", "audit_completed", "checkout_started", "converted"].includes(r.outreach_status)).length,
      auditStarted: rows.filter((r: any) => ["audit_started", "audit_completed", "checkout_started", "converted"].includes(r.outreach_status)).length,
      converted: rows.filter((r: any) => r.outreach_status === "converted").length,
    });
    setLoading(false);
  }

  const kpiCards = [
    { label: "Importés", value: stats.imported, icon: Users },
    { label: "Enrichis", value: stats.enriched, icon: Target },
    { label: "Pages prêtes", value: stats.pageReady, icon: Eye },
    { label: "Envoyés", value: stats.sent, icon: Send },
    { label: "Engagés", value: stats.engaged, icon: Flame },
    { label: "Audits", value: stats.auditStarted, icon: TrendingUp },
    { label: "Convertis", value: stats.converted, icon: CheckCircle2 },
  ];

  const filteredTargets = statusFilter === "all" ? targets : targets.filter(t => t.outreach_status === statusFilter);
  const hotLeads = targets.filter((t: any) => (t.heat_score || 0) >= 40);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Sniper Command Center</h1>
          <p className="text-sm text-muted-foreground">Pipeline d'acquisition UNPRO</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>Rafraîchir</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 text-center">
              <k.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-2xl font-bold">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk Actions */}
      <SniperBulkActions targets={targets} onRefresh={loadData} />

      <Tabs defaultValue="pipeline">
        <TabsList className="flex-wrap">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="hot">Hot Leads ({hotLeads.length})</TabsTrigger>
          <TabsTrigger value="territory">Territoires</TabsTrigger>
          <TabsTrigger value="rep">Rep Queue</TabsTrigger>
          <TabsTrigger value="import">Import CSV</TabsTrigger>
        </TabsList>

        {/* Pipeline */}
        <TabsContent value="pipeline">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Tous les targets</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Filtre statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="not_started">Non démarré</SelectItem>
                  <SelectItem value="page_ready">Page prête</SelectItem>
                  <SelectItem value="message_ready">Message prêt</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="engaged">Engagé</SelectItem>
                  <SelectItem value="audit_started">Audit lancé</SelectItem>
                  <SelectItem value="converted">Converti</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-center py-8 text-muted-foreground">Chargement…</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Heat</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Canal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTargets.map((t: any) => {
                      const heat = getHeatLabel(t.heat_score || 0);
                      return (
                        <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDrawerTargetId(t.id)}>
                          <TableCell className="font-medium">{t.business_name}</TableCell>
                          <TableCell>{t.city || "—"}</TableCell>
                          <TableCell>{t.category || "—"}</TableCell>
                          <TableCell>{t.sniper_priority_score != null ? Math.round(t.sniper_priority_score) : "—"}</TableCell>
                          <TableCell><span className={heat.color}>{heat.label}</span></TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{t.outreach_status}</Badge></TableCell>
                          <TableCell>{t.recommended_channel || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hot Leads */}
        <TabsContent value="hot">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" /> Leads chauds</CardTitle></CardHeader>
            <CardContent>
              {hotLeads.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucun lead chaud pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {hotLeads.map((t: any) => {
                    const heat = getHeatLabel(t.heat_score || 0);
                    return (
                      <div key={t.id} className="flex items-center justify-between rounded-xl border border-border/30 bg-card/10 px-4 py-3 cursor-pointer" onClick={() => setDrawerTargetId(t.id)}>
                        <div>
                          <div className="font-medium">{t.business_name}</div>
                          <div className="text-xs text-muted-foreground">{t.city} · {t.category}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-medium ${heat.color}`}>{heat.label} ({Math.round(t.heat_score)})</span>
                          {t.founder_eligible && <Badge className="text-[10px]">Founder</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Territory Gaps */}
        <TabsContent value="territory">
          <SniperTerritoryGaps targets={targets} />
        </TabsContent>

        {/* Rep Queue */}
        <TabsContent value="rep">
          <SniperRepQueue targets={targets} />
        </TabsContent>

        {/* CSV Import */}
        <TabsContent value="import">
          <SniperCsvImport onImported={loadData} />
        </TabsContent>
      </Tabs>

      {/* Target Detail Drawer */}
      <SniperTargetDrawer
        targetId={drawerTargetId}
        open={!!drawerTargetId}
        onClose={() => setDrawerTargetId(null)}
        onRefresh={loadData}
      />
    </div>
  );
}
