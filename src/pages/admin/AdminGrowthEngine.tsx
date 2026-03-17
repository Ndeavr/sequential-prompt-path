/**
 * UNPRO — Autonomous Growth Engine Dashboard
 * Admin view of the self-reinforcing growth flywheel.
 */

import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, StatCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useGrowthDashboard,
  useFlywheelStatus,
  usePendingGrowthEvents,
  useExpandContent,
  useExpandCities,
  useDiscoverTransformations,
  useAnalyzeTraffic,
  usePromoteTransformations,
  useApproveGrowthEvent,
  useRejectGrowthEvent,
} from "@/hooks/useGrowthEngine2";
import {
  Zap, Globe, FileText, Users, Briefcase, ArrowRight,
  CheckCircle, XCircle, Play, BarChart3, Palette, Calendar,
  RefreshCw, TrendingUp, Target, Layers,
} from "lucide-react";

const ENGINE_ICONS: Record<string, React.ReactNode> = {
  "content-expansion": <FileText className="h-4 w-4" />,
  "city-expansion": <Globe className="h-4 w-4" />,
  "transformation-discovery": <Palette className="h-4 w-4" />,
  "traffic-analyzer": <BarChart3 className="h-4 w-4" />,
  "transformation-promoter": <TrendingUp className="h-4 w-4" />,
  "authority-recalculator": <Target className="h-4 w-4" />,
  "seo-builder-agent": <Layers className="h-4 w-4" />,
};

const EVENT_COLORS: Record<string, string> = {
  content_generated: "bg-blue-500/10 text-blue-500",
  city_expansion_opportunity: "bg-green-500/10 text-green-500",
  transformation_opportunity: "bg-purple-500/10 text-purple-500",
  transformation_promoted: "bg-amber-500/10 text-amber-500",
  graph_node_suggested: "bg-cyan-500/10 text-cyan-500",
};

const AdminGrowthEngine = () => {
  const { data: dashboard, isLoading } = useGrowthDashboard();
  const { data: flywheel } = useFlywheelStatus();
  const { data: pendingEvents } = usePendingGrowthEvents();

  const expandContent = useExpandContent();
  const expandCities = useExpandCities();
  const discoverTransformations = useDiscoverTransformations();
  const analyzeTraffic = useAnalyzeTraffic();
  const promoteTransformations = usePromoteTransformations();
  const approveEvent = useApproveGrowthEvent();
  const rejectEvent = useRejectGrowthEvent();

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;

  const stats = dashboard?.stats ?? {};
  const engines = dashboard?.engines ?? [];
  const events = dashboard?.recentEvents ?? [];
  const pending = pendingEvents ?? [];
  const stages = flywheel?.stages ?? [];

  return (
    <AdminLayout>
      <PageHeader
        title="Moteur de Croissance Autonome"
        description="Flywheel SEO × Transformations × Matching × Authority"
      />

      <Tabs defaultValue="flywheel" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="flywheel">Flywheel</TabsTrigger>
          <TabsTrigger value="engines">Moteurs</TabsTrigger>
          <TabsTrigger value="review">
            File d'attente
            {pending.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">{pending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="events">Activité</TabsTrigger>
        </TabsList>

        {/* ── FLYWHEEL TAB ── */}
        <TabsContent value="flywheel" className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="Pages SEO" value={stats.seo_pages_total ?? 0} icon={<FileText className="h-4 w-4" />} />
            <StatCard title="Pages Ville" value={stats.problem_city_pages_total ?? 0} icon={<Globe className="h-4 w-4" />} />
            <StatCard title="Projets Design" value={stats.design_projects_total ?? 0} icon={<Palette className="h-4 w-4" />} />
            <StatCard title="Rendez-vous" value={stats.appointments_total ?? 0} icon={<Calendar className="h-4 w-4" />} />
          </div>

          {/* Flywheel Loop Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                Boucle de Croissance Autonome
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {stages.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className="bg-primary/10 rounded-lg px-3 py-2 text-center min-w-[100px]">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-lg font-bold text-primary">{s.count.toLocaleString()}</p>
                    </div>
                    {i < stages.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                ))}
                {stages.length > 0 && (
                  <>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="bg-primary/10 rounded-lg px-3 py-2 text-center min-w-[100px]">
                      <p className="text-xs text-muted-foreground">↻ Boucle</p>
                      <p className="text-lg font-bold text-primary">∞</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ENGINES TAB ── */}
        <TabsContent value="engines" className="space-y-6">
          {/* Manual triggers */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Actions manuelles</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button size="sm" onClick={() => expandContent.mutate()} disabled={expandContent.isPending}>
                <Play className="h-3 w-3 mr-1" /> Générer contenu
              </Button>
              <Button size="sm" variant="outline" onClick={() => expandCities.mutate()} disabled={expandCities.isPending}>
                <Globe className="h-3 w-3 mr-1" /> Expansion villes
              </Button>
              <Button size="sm" variant="outline" onClick={() => discoverTransformations.mutate()} disabled={discoverTransformations.isPending}>
                <Palette className="h-3 w-3 mr-1" /> Découvrir transformations
              </Button>
              <Button size="sm" variant="outline" onClick={() => analyzeTraffic.mutate()} disabled={analyzeTraffic.isPending}>
                <BarChart3 className="h-3 w-3 mr-1" /> Analyser trafic
              </Button>
              <Button size="sm" variant="outline" onClick={() => promoteTransformations.mutate()} disabled={promoteTransformations.isPending}>
                <TrendingUp className="h-3 w-3 mr-1" /> Promouvoir
              </Button>
            </CardContent>
          </Card>

          {/* Engine Status */}
          <div className="grid gap-3">
            {engines.map((e) => (
              <Card key={e.key}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {ENGINE_ICONS[e.key] ?? <Zap className="h-4 w-4" />}
                    <div>
                      <p className="font-medium text-sm">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Dernier run: {e.last_run_at ? new Date(e.last_run_at).toLocaleString("fr-CA") : "Jamais"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={e.is_enabled ? "default" : "secondary"}>
                      {e.is_enabled ? "Actif" : "Inactif"}
                    </Badge>
                    {e.last_status && (
                      <Badge variant={e.last_status === "completed" ? "outline" : "destructive"}>
                        {e.last_status}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {engines.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun agent de croissance enregistré. Lancez une action manuelle pour initialiser.</p>
            )}
          </div>
        </TabsContent>

        {/* ── REVIEW QUEUE TAB ── */}
        <TabsContent value="review" className="space-y-4">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement en attente de révision.</p>
          ) : (
            pending.map((ev) => (
              <Card key={ev.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={EVENT_COLORS[ev.event_type] ?? "bg-muted text-foreground"}>
                          {ev.event_type.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{ev.source_engine}</span>
                      </div>
                      <p className="font-medium text-sm">{ev.title}</p>
                      {ev.description && <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveEvent.mutate({ eventId: ev.id, userId: "" })}
                        disabled={approveEvent.isPending}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => rejectEvent.mutate({ eventId: ev.id, userId: "" })}
                        disabled={rejectEvent.isPending}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── EVENTS TAB ── */}
        <TabsContent value="events" className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 text-sm border-b pb-2">
                <Badge className={EVENT_COLORS[ev.event_type] ?? "bg-muted text-foreground"} variant="outline">
                  {ev.event_type.replace(/_/g, " ")}
                </Badge>
                <span className="flex-1 truncate">{ev.title}</span>
                <Badge variant={ev.status === "approved" ? "default" : ev.status === "pending" ? "secondary" : "outline"}>
                  {ev.status}
                </Badge>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(ev.created_at).toLocaleDateString("fr-CA")}
                </span>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminGrowthEngine;
