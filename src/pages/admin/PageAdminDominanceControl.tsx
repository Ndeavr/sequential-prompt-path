/**
 * PageAdminDominanceControl — Admin dashboard for AEO Dominance Engine
 * Manage service entities, content pages, SERP validation, revenue tracking.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, FileText, CheckCircle, DollarSign, TrendingUp, Zap, MapPin, AlertTriangle } from "lucide-react";

export default function PageAdminDominanceControl() {
  const [tab, setTab] = useState("entities");

  const { data: entities } = useQuery({
    queryKey: ["admin-entities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_entity_master")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const { data: contentPages } = useQuery({
    queryKey: ["admin-content-pages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_pages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const { data: serpResults } = useQuery({
    queryKey: ["admin-serp"],
    queryFn: async () => {
      const { data } = await supabase
        .from("serp_validation")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: revenueEvents } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("revenue_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: demandSignals } = useQuery({
    queryKey: ["admin-demand"],
    queryFn: async () => {
      const { data } = await supabase
        .from("demand_signals_qc")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const publishedCount = contentPages?.filter((p) => p.published).length ?? 0;
  const validSerpCount = serpResults?.filter((s) => s.is_valid).length ?? 0;
  const totalRevenue = revenueEvents?.reduce((s, e) => s + (e.value_cents ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">🏆 Dominance Engine</h1>
          <p className="text-sm text-muted-foreground">AEO Content Factory + Revenue Loop</p>
        </div>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Globe className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-black">{entities?.length ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Entités</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-5 h-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-black">{publishedCount}</p>
            <p className="text-[10px] text-muted-foreground">Pages publiées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-black">{validSerpCount}</p>
            <p className="text-[10px] text-muted-foreground">SERP validées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-2xl font-black">{(totalRevenue / 100).toLocaleString("fr-CA")}$</p>
            <p className="text-[10px] text-muted-foreground">Revenus</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="entities" className="text-xs">Entités</TabsTrigger>
          <TabsTrigger value="pages" className="text-xs">Pages</TabsTrigger>
          <TabsTrigger value="serp" className="text-xs">SERP</TabsTrigger>
          <TabsTrigger value="demand" className="text-xs">Demande</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">Revenus</TabsTrigger>
        </TabsList>

        {/* Entities Tab */}
        <TabsContent value="entities" className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nom</TableHead>
                <TableHead className="text-xs">Catégorie</TableHead>
                <TableHead className="text-xs">Urgence</TableHead>
                <TableHead className="text-xs">Prix</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entities?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs font-medium">{e.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{e.category}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={e.urgency_level === "critical" ? "destructive" : "outline"} className="text-[10px]">
                      {e.urgency_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {e.avg_price_low?.toLocaleString()}$ — {e.avg_price_high?.toLocaleString()}$
                  </TableCell>
                </TableRow>
              ))}
              {(!entities || entities.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                    Aucune entité. Lancez le batch de génération.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Titre</TableHead>
                <TableHead className="text-xs">Ville</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
                <TableHead className="text-xs">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contentPages?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs font-medium max-w-[200px] truncate">{p.title}</TableCell>
                  <TableCell className="text-xs">{p.city ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={p.published ? "default" : "secondary"} className="text-[10px]">
                      {p.published ? "Publié" : "Brouillon"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.generation_source}</TableCell>
                </TableRow>
              ))}
              {(!contentPages || contentPages.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                    Aucune page générée.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* SERP Tab */}
        <TabsContent value="serp" className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Requête</TableHead>
                <TableHead className="text-xs">Ville</TableHead>
                <TableHead className="text-xs">Validé</TableHead>
                <TableHead className="text-xs">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serpResults?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs font-medium max-w-[200px] truncate">{s.query_text}</TableCell>
                  <TableCell className="text-xs">{s.city ?? "—"}</TableCell>
                  <TableCell>
                    {s.is_valid
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <AlertTriangle className="w-4 h-4 text-orange-500" />}
                  </TableCell>
                  <TableCell className="text-xs">{s.variation_score}</TableCell>
                </TableRow>
              ))}
              {(!serpResults || serpResults.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                    Aucune validation SERP.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Demand Tab */}
        <TabsContent value="demand" className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Requête</TableHead>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs">Volume</TableHead>
                <TableHead className="text-xs">Tendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {demandSignals?.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs font-medium max-w-[200px] truncate">{d.raw_query ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{d.source}</Badge></TableCell>
                  <TableCell className="text-xs">{d.volume_estimate}</TableCell>
                  <TableCell>
                    <Badge variant={d.trend === "rising" ? "default" : "secondary"} className="text-[10px]">
                      {d.trend}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!demandSignals || demandSignals.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                    Aucun signal de demande.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Valeur</TableHead>
                <TableHead className="text-xs">Ville</TableHead>
                <TableHead className="text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueEvents?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.event_type}</Badge></TableCell>
                  <TableCell className="text-xs font-bold">{((r.value_cents ?? 0) / 100).toLocaleString("fr-CA")}$</TableCell>
                  <TableCell className="text-xs">{r.city ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("fr-CA")}
                  </TableCell>
                </TableRow>
              ))}
              {(!revenueEvents || revenueEvents.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                    Aucun événement de revenu.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
