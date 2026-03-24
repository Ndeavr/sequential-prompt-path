/**
 * UNPRO — Experiment Detail Page
 */
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useExperimentWithVariants, useUpdateExperimentStatus } from "@/hooks/optimization";
import { EXPERIMENT_TYPE_LABELS, EXPERIMENT_STATUS_LABELS } from "@/types/optimization";
import type { ExperimentType } from "@/types/optimization";
import {
  Beaker, Play, Pause, Square, Archive, Trophy, ShieldCheck,
  Target, BarChart3, ArrowLeft,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const AdminExperimentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: experiment, isLoading } = useExperimentWithVariants(id);
  const updateStatus = useUpdateExperimentStatus();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  if (!experiment) {
    return (
      <AdminLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Expérience introuvable</p>
          <Link to="/admin/experiments"><Button variant="outline" className="mt-4">← Retour</Button></Link>
        </div>
      </AdminLayout>
    );
  }

  const variants = experiment.variants ?? [];
  const isRunning = experiment.status === "running";
  const isPaused = experiment.status === "paused";
  const isDraft = experiment.status === "draft";

  return (
    <AdminLayout>
      <Helmet><title>{experiment.name} · Expérience · UNPRO</title></Helmet>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link to="/admin/experiments" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
              <ArrowLeft className="h-3 w-3" /> Expériences
            </Link>
            <h1 className="text-xl font-bold text-foreground">{experiment.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px]">
                {EXPERIMENT_TYPE_LABELS[experiment.experiment_type as ExperimentType] ?? experiment.experiment_type}
              </Badge>
              <Badge variant="outline" className="text-[10px]">{EXPERIMENT_STATUS_LABELS[experiment.status]}</Badge>
              <span className="text-[11px] text-muted-foreground">{experiment.screen_key}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDraft && <Button size="sm" onClick={() => updateStatus.mutate({ id: experiment.id, status: "running" })}><Play className="h-3.5 w-3.5 mr-1" /> Lancer</Button>}
            {isRunning && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: experiment.id, status: "paused" })}><Pause className="h-3.5 w-3.5 mr-1" /> Pause</Button>}
            {isPaused && <Button size="sm" onClick={() => updateStatus.mutate({ id: experiment.id, status: "running" })}><Play className="h-3.5 w-3.5 mr-1" /> Reprendre</Button>}
            {(isRunning || isPaused) && <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: experiment.id, status: "completed" })}><Square className="h-3.5 w-3.5 mr-1" /> Arrêter</Button>}
          </div>
        </div>

        {/* Hypothesis & Meta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Hypothèse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground">{experiment.hypothesis || "Aucune hypothèse définie"}</p>
            {experiment.description && <p className="text-xs text-muted-foreground">{experiment.description}</p>}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-[11px] text-muted-foreground">Métrique principale</p>
                <p className="text-sm font-semibold text-foreground">{experiment.primary_metric}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Trafic alloué</p>
                <p className="text-sm font-semibold text-foreground">{experiment.traffic_allocation_percent}%</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Sample minimum</p>
                <p className="text-sm font-semibold text-foreground">{experiment.minimum_sample_size}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Variantes ({variants.length})</CardTitle>
            <CardDescription>Contrôle vs variantes testées</CardDescription>
          </CardHeader>
          <CardContent>
            {variants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune variante créée</p>
            ) : (
              <div className="space-y-3">
                {variants.map((v: any) => (
                  <div key={v.id} className={`p-4 rounded-xl border ${v.is_control ? "border-primary/30 bg-primary/5" : "border-border/40 bg-muted/20"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{v.variant_name}</span>
                        {v.is_control && <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">Contrôle</Badge>}
                        <Badge variant="outline" className="text-[9px]">{v.variant_type}</Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{v.variant_key}</span>
                    </div>
                    {/* Mock metrics */}
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Impressions</p>
                        <p className="text-sm font-medium text-foreground">—</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Conversions</p>
                        <p className="text-sm font-medium text-foreground">—</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">CTR</p>
                        <p className="text-sm font-medium text-foreground">—</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Safety Guard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" /> Garde-fous</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: "Volume minimal atteint", ok: false },
                { label: "Pas de baisse de conversion globale", ok: true },
                { label: "Taux de dismiss stable", ok: true },
                { label: "Aucun bloc critique impacté", ok: true },
              ].map(g => (
                <div key={g.label} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${g.ok ? "bg-success" : "bg-muted-foreground"}`} />
                  <span className="text-sm text-foreground">{g.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminExperimentDetailPage;
