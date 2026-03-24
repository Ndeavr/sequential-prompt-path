/**
 * UNPRO — Admin Experiments List Page
 */
import { Helmet } from "react-helmet-async";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { useOptimizationExperiments, useUpdateExperimentStatus } from "@/hooks/optimization";
import { Beaker, Play, Pause, Archive, Eye } from "lucide-react";
import { EXPERIMENT_TYPE_LABELS, EXPERIMENT_STATUS_LABELS } from "@/types/optimization";
import type { ExperimentType, ExperimentStatus } from "@/types/optimization";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  running: "bg-success/10 text-success border-success/20",
  paused: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  archived: "bg-muted text-muted-foreground",
};

const AdminExperimentsPage = () => {
  const { data: experiments, isLoading } = useOptimizationExperiments();
  const updateStatus = useUpdateExperimentStatus();
  const list = experiments ?? [];

  const grouped = {
    all: list,
    running: list.filter(e => e.status === "running"),
    draft: list.filter(e => e.status === "draft"),
    completed: list.filter(e => e.status === "completed" || e.status === "archived"),
  };

  const renderList = (items: typeof list) => {
    if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;
    if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">Aucune expérience</p>;
    return (
      <div className="space-y-3">
        {items.map(exp => (
          <Card key={exp.id} className="hover:border-primary/20 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground truncate">{exp.name}</p>
                    <Badge className={`text-[10px] ${statusColors[exp.status] ?? ""}`}>
                      {EXPERIMENT_STATUS_LABELS[exp.status]}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{exp.hypothesis}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px]">{EXPERIMENT_TYPE_LABELS[exp.experiment_type as ExperimentType] ?? exp.experiment_type}</Badge>
                    <span className="text-[10px] text-muted-foreground">{exp.screen_key}</span>
                    <span className="text-[10px] text-muted-foreground">· {exp.traffic_allocation_percent}% trafic</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {exp.status === "draft" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: exp.id, status: "running" })}>
                      <Play className="h-3.5 w-3.5 text-success" />
                    </Button>
                  )}
                  {exp.status === "running" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: exp.id, status: "paused" })}>
                      <Pause className="h-3.5 w-3.5 text-warning" />
                    </Button>
                  )}
                  {exp.status === "paused" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: exp.id, status: "running" })}>
                      <Play className="h-3.5 w-3.5 text-success" />
                    </Button>
                  )}
                  <Link to={`/admin/experiments/${exp.id}`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <Helmet><title>Expériences · Optimisation IA · UNPRO</title></Helmet>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Expériences</h1>
            <p className="text-sm text-muted-foreground">{list.length} expérience{list.length !== 1 ? "s" : ""} au total</p>
          </div>
          <Link to="/admin/optimization"><Button variant="outline" size="sm">← Dashboard</Button></Link>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all">Toutes ({grouped.all.length})</TabsTrigger>
            <TabsTrigger value="running">En cours ({grouped.running.length})</TabsTrigger>
            <TabsTrigger value="draft">Brouillons ({grouped.draft.length})</TabsTrigger>
            <TabsTrigger value="completed">Terminées ({grouped.completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">{renderList(grouped.all)}</TabsContent>
          <TabsContent value="running" className="mt-4">{renderList(grouped.running)}</TabsContent>
          <TabsContent value="draft" className="mt-4">{renderList(grouped.draft)}</TabsContent>
          <TabsContent value="completed" className="mt-4">{renderList(grouped.completed)}</TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminExperimentsPage;
