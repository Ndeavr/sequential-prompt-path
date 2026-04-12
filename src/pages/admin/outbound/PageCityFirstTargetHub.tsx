import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Rocket, ChevronRight, Plus, Zap, Target } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const stageLabels: Record<string, { label: string; cls: string }> = {
  draft: { label: "Brouillon", cls: "bg-muted text-muted-foreground" },
  active: { label: "Actif", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  running: { label: "En exécution", cls: "bg-primary/20 text-primary border-primary/30" },
  completed: { label: "Terminé", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  paused: { label: "En pause", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  pending: { label: "En attente", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  ready: { label: "Prêt", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

export default function PageCityFirstTargetHub() {
  const qc = useQueryClient();
  const [newCity, setNewCity] = useState("");

  const { data: cities, isLoading } = useQuery({
    queryKey: ["city-targets"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_city_targets").select("*").order("priority_score", { ascending: false });
      return data || [];
    },
  });

  const { data: serviceCounts } = useQuery({
    queryKey: ["city-service-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_city_service_targets").select("city_target_id");
      const counts: Record<string, number> = {};
      data?.forEach((r: any) => { counts[r.city_target_id] = (counts[r.city_target_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: runCounts } = useQuery({
    queryKey: ["city-run-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("outbound_autopilot_runs").select("city_target_id, status, current_stage");
      const counts: Record<string, { total: number; completed: number; running: number; failed: number }> = {};
      data?.forEach((r: any) => {
        if (!r.city_target_id) return;
        if (!counts[r.city_target_id]) counts[r.city_target_id] = { total: 0, completed: 0, running: 0, failed: 0 };
        counts[r.city_target_id].total++;
        if (r.status === "completed") counts[r.city_target_id].completed++;
        if (r.status === "running") counts[r.city_target_id].running++;
        if (r.status === "failed") counts[r.city_target_id].failed++;
      });
      return counts;
    },
  });

  const addCity = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { error } = await supabase.from("agent_city_targets").insert({ city_name: name, city_slug: slug, priority_score: 50, status: "draft" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["city-targets"] }); setNewCity(""); toast.success("Ville ajoutée"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/5 border border-border/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center"><MapPin className="h-5 w-5 text-primary" /></div>
            <div>
              <h1 className="font-display text-xl font-bold">Orchestration City-First</h1>
              <p className="text-sm text-muted-foreground">Exécution par ville, puis spécialités par vagues</p>
            </div>
          </div>
        </div>

        {/* Add city */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Ajouter une ville cible</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input placeholder="Ex: Longueuil" value={newCity} onChange={(e) => setNewCity(e.target.value)} className="flex-1" />
              <Button onClick={() => newCity.trim() && addCity.mutate(newCity.trim())} disabled={!newCity.trim() || addCity.isPending}>
                <Rocket className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* City list */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-4 w-4" /> Villes cibles</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground animate-pulse">Chargement…</div>
            ) : !cities?.length ? (
              <div className="p-6 text-center text-muted-foreground">Aucune ville cible</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ville</TableHead>
                    <TableHead className="text-center">Priorité</TableHead>
                    <TableHead className="text-center">Services</TableHead>
                    <TableHead className="text-center">Runs</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cities.map((city: any) => {
                    const svc = serviceCounts?.[city.id] || 0;
                    const runs = runCounts?.[city.id] || { total: 0, completed: 0, running: 0, failed: 0 };
                    const cfg = stageLabels[city.status] || stageLabels.draft;
                    return (
                      <TableRow key={city.id}>
                        <TableCell className="font-semibold">{city.city_name}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-mono">{city.priority_score}</span>
                        </TableCell>
                        <TableCell className="text-center">{svc}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 text-xs">
                            {runs.running > 0 && <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">{runs.running} actif</Badge>}
                            {runs.completed > 0 && <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400">{runs.completed} ✓</Badge>}
                            {runs.failed > 0 && <Badge variant="outline" className="bg-red-500/20 text-red-400">{runs.failed} ✗</Badge>}
                            {runs.total === 0 && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Link to={`/admin/outbound/cities/${city.city_slug}`}>
                            <Button variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /></Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
