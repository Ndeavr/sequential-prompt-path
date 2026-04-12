import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Rocket, CheckCircle, Clock, AlertTriangle, Pause, Play, Target } from "lucide-react";

const stageBadge = (s: string) => {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: any }> = {
    queued: { variant: "outline", label: "En file", icon: Clock },
    scraping: { variant: "default", label: "Scraping", icon: Activity },
    qualifying: { variant: "secondary", label: "Qualification", icon: Target },
    sending: { variant: "default", label: "Envoi", icon: Rocket },
    paused: { variant: "outline", label: "Pause", icon: Pause },
    completed: { variant: "secondary", label: "Terminé", icon: CheckCircle },
    error: { variant: "destructive", label: "Erreur", icon: AlertTriangle },
  };
  const m = map[s] || { variant: "outline" as const, label: s, icon: Clock };
  const Icon = m.icon;
  return (
    <Badge variant={m.variant} className="gap-1">
      <Icon className="h-3 w-3" /> {m.label}
    </Badge>
  );
};

export default function PageOutboundAutopilotRuns() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ["autopilot-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outbound_autopilot_runs")
        .select("*, agent_target_items(raw_label, service_name, city_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const runsByStage = (stage: string) => runs?.filter((r) => r.current_stage === stage).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-border/40 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Autopilot — Exécution</h1>
          </div>
          <p className="text-muted-foreground text-sm">Suivi en temps réel de tous les runs autopilot par marché cible</p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            {[
              { label: "En file", value: runsByStage("queued"), color: "text-muted-foreground" },
              { label: "Scraping", value: runsByStage("scraping"), color: "text-primary" },
              { label: "Qualification", value: runsByStage("qualifying"), color: "text-secondary" },
              { label: "Envoi", value: runsByStage("sending"), color: "text-primary" },
              { label: "Terminés", value: runsByStage("completed"), color: "text-muted-foreground" },
            ].map((s) => (
              <Card key={s.label} className="bg-card/60">
                <CardContent className="p-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Runs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des runs</CardTitle>
            <CardDescription>Chaque marché cible approuvé génère un run autopilot</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : !runs?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Rocket className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucun run en cours</p>
                <p className="text-xs mt-1">Approuvez des marchés pour démarrer l'autopilot</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marché</TableHead>
                    <TableHead>Étape</TableHead>
                    <TableHead className="hidden md:table-cell">Priorité</TableHead>
                    <TableHead className="hidden md:table-cell">Démarré</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => {
                    const item = run.agent_target_items as any;
                    return (
                      <TableRow key={run.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {item?.service_name || item?.raw_label || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">{item?.city_name || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell>{stageBadge(run.current_stage)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="font-semibold text-sm">{run.priority_score || "—"}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {run.started_at ? new Date(run.started_at).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" }) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={run.status === "running" ? "default" : run.status === "completed" ? "secondary" : "outline"}>
                            {run.status}
                          </Badge>
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
