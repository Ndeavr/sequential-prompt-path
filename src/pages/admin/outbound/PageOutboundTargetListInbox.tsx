import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target, Upload, Zap, CheckCircle, Clock, AlertCircle, TrendingUp, MapPin, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MOCK_ITEMS = [
  "Toiture Laval", "Asphalte Laval", "Plomberie Longueuil", "Déménagement Montréal",
  "Lavage de vitres Brossard", "Émondage Terrebonne", "Climatisation Brossard",
  "Isolation grenier Laval", "Électricien Sherbrooke", "Peinture Gatineau",
  "Excavation Trois-Rivières", "Fenêtres Québec", "Gouttières Repentigny",
  "Pavage Saint-Jean", "Nettoyage conduits Drummondville"
];

const statusBadge = (s: string) => {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    imported: { variant: "outline", label: "Importée" },
    normalized: { variant: "secondary", label: "Normalisée" },
    review_ready: { variant: "default", label: "Prête" },
    running: { variant: "default", label: "En cours" },
    completed: { variant: "secondary", label: "Terminée" },
    error: { variant: "destructive", label: "Erreur" },
  };
  const m = map[s] || { variant: "outline" as const, label: s };
  return <Badge variant={m.variant}>{m.label}</Badge>;
};

export default function PageOutboundTargetListInbox() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [importing, setImporting] = useState(false);

  const { data: lists, isLoading } = useQuery({
    queryKey: ["agent-target-lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_target_lists")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const importMock = useMutation({
    mutationFn: async () => {
      setImporting(true);
      // Create list
      const { data: list, error: listErr } = await supabase
        .from("agent_target_lists")
        .insert({ name: `Liste Agent — ${new Date().toLocaleDateString("fr-CA")}`, source_agent: "market_discovery", item_count: MOCK_ITEMS.length })
        .select()
        .single();
      if (listErr) throw listErr;

      // Create items
      const items = MOCK_ITEMS.map((raw) => ({ target_list_id: list.id, raw_label: raw }));
      const { error: itemErr } = await supabase.from("agent_target_items").insert(items);
      if (itemErr) throw itemErr;

      return list;
    },
    onSuccess: () => {
      toast.success("Liste agentique importée avec succès");
      qc.invalidateQueries({ queryKey: ["agent-target-lists"] });
      setImporting(false);
    },
    onError: (e: any) => {
      toast.error(e.message);
      setImporting(false);
    },
  });

  const normalizeMutation = useMutation({
    mutationFn: async (listId: string) => {
      const { data: items } = await supabase
        .from("agent_target_items")
        .select("*")
        .eq("target_list_id", listId)
        .eq("review_status", "pending_normalization");

      if (!items?.length) throw new Error("Aucun item à normaliser");

      for (const item of items) {
        const parts = item.raw_label.trim().split(/\s+/);
        const city = parts.pop() || "";
        const service = parts.join(" ") || city;
        const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");

        await supabase.from("agent_target_items").update({
          service_name: service,
          city_name: city,
          specialty_slug: slug(service),
          city_slug: slug(city),
          combined_market_key: `${slug(service)}-${slug(city)}`,
          priority_score: Math.round(50 + Math.random() * 40),
          estimated_lead_volume: Math.round(20 + Math.random() * 100),
          review_status: "ready_for_review",
        }).eq("id", item.id);
      }

      await supabase.from("agent_target_lists").update({ status: "normalized" }).eq("id", listId);
    },
    onSuccess: () => {
      toast.success("Items normalisés avec succès");
      qc.invalidateQueries({ queryKey: ["agent-target-lists"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalItems = lists?.reduce((a, l) => a + (l.item_count || 0), 0) || 0;
  const readyLists = lists?.filter((l) => l.status === "review_ready" || l.status === "normalized").length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-border/40 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-6 w-6 text-primary" />
                <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
                  Autopilot — Marchés Cibles
                </h1>
              </div>
              <p className="text-muted-foreground text-sm max-w-xl">
                Importez les listes de marchés générées par l'agent, normalisez, révisez et lancez automatiquement les campagnes.
              </p>
            </div>
            <Button onClick={() => importMock.mutate()} disabled={importing} variant="premium" size="lg">
              <Upload className="h-4 w-4 mr-2" />
              Importer liste agent
            </Button>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { label: "Listes", value: lists?.length || 0, icon: Target },
              { label: "Items total", value: totalItems, icon: MapPin },
              { label: "Prêtes", value: readyLists, icon: CheckCircle },
            ].map((s) => (
              <Card key={s.label} className="bg-card/60 backdrop-blur">
                <CardContent className="p-3 flex items-center gap-3">
                  <s.icon className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Lists Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Listes Agentiques
            </CardTitle>
            <CardDescription>Toutes les listes de marchés cibles importées</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : !lists?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucune liste importée</p>
                <p className="text-xs mt-1">Cliquez « Importer liste agent » pour commencer</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium text-sm">{l.name}</TableCell>
                      <TableCell>{l.item_count}</TableCell>
                      <TableCell>{statusBadge(l.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {l.status === "imported" && (
                            <Button size="sm" variant="soft" onClick={() => normalizeMutation.mutate(l.id)}>
                              <Zap className="h-3 w-3 mr-1" /> Normaliser
                            </Button>
                          )}
                          {(l.status === "normalized" || l.status === "review_ready") && (
                            <Button size="sm" onClick={() => navigate(`/admin/outbound/targets/review?list=${l.id}`)}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Revoir
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
