import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Rocket, Activity, BarChart3 } from "lucide-react";
import PanelImportProspect from "@/components/prospect-execution/PanelImportProspect";
import WidgetRunStatus from "@/components/prospect-execution/WidgetRunStatus";
import WidgetLeadSourceBadge from "@/components/prospect-execution/WidgetLeadSourceBadge";

export default function PageAdminProspectExecutionDashboard() {
  const navigate = useNavigate();
  const [, setRefreshKey] = useState(0);

  const { data: runs, isLoading } = useQuery({
    queryKey: ["prospect-execution-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_execution_runs")
        .select("*, prospect_records(company_name, domain, lead_source, category_primary)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery({
    queryKey: ["prospect-execution-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_execution_runs")
        .select("status");
      if (error) throw error;
      const total = data.length;
      const completed = data.filter((r) => r.status === "completed").length;
      const running = data.filter((r) => r.status === "running").length;
      const failed = data.filter((r) => r.status === "failed").length;
      return { total, completed, running, failed };
    },
    refetchInterval: 10000,
  });

  const handleRunStarted = (runId: string) => {
    setRefreshKey((k) => k + 1);
    navigate(`/admin/prospect-execution/${runId}`);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Hero */}
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-display font-bold flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Prospect Execution Engine
        </h1>
        <p className="text-sm text-muted-foreground">
          Pipeline complet : Import → Enrichissement → AIPP → Plan → Email → Envoi
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total runs", value: stats?.total ?? 0, icon: Activity },
          { label: "En cours", value: stats?.running ?? 0, icon: Rocket },
          { label: "Terminés", value: stats?.completed ?? 0, icon: BarChart3 },
          { label: "Échoués", value: stats?.failed ?? 0, icon: Activity },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Import panel */}
        <div className="md:col-span-1">
          <PanelImportProspect onRunStarted={handleRunStarted} />
        </div>

        {/* Runs table */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Runs récents</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !runs?.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Aucun run. Lancez votre premier pipeline.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prospect</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Progression</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((r: any) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => navigate(`/admin/prospect-execution/${r.id}`)}
                      >
                        <TableCell className="font-medium">
                          {r.prospect_records?.company_name || r.prospect_records?.domain || "—"}
                        </TableCell>
                        <TableCell>
                          <WidgetLeadSourceBadge source={r.prospect_records?.lead_source || "manual_admin"} />
                        </TableCell>
                        <TableCell>
                          <WidgetRunStatus status={r.status} />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{r.completion_percent ?? 0}%</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(r.created_at).toLocaleDateString("fr-CA")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
