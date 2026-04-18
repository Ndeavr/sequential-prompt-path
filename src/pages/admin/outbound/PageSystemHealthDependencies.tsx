import AdminLayout from "@/layouts/AdminLayout";
import { ArrowLeft, Bot, Shield, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { usePipelineLiveOverview, usePipelineAgentsLive } from "@/hooks/usePipelineCommandCenter";
import WidgetDependencyHealthGrid from "@/components/admin/pipeline-cc/WidgetDependencyHealthGrid";
import PanelAgentExecutionMap from "@/components/admin/pipeline-cc/PanelAgentExecutionMap";

export default function PageSystemHealthDependencies() {
  const navigate = useNavigate();
  const overview = usePipelineLiveOverview();
  const agents = usePipelineAgentsLive();

  const isLoading = overview.isLoading || agents.isLoading;
  const isError = overview.isError || agents.isError;

  return (
    <AdminLayout>
      <div className="space-y-3 p-3 md:p-6 max-w-5xl mx-auto pb-20">
        <header className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-xl font-bold font-display flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">Santé système</span>
            </h1>
            <p className="text-[11px] text-muted-foreground">Dépendances · Agents · Heartbeat</p>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="p-6 text-center">
              <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Erreur de chargement</p>
              <Button size="sm" variant="outline" onClick={() => { overview.refetch(); agents.refetch(); }} className="mt-3">Réessayer</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Shield className="h-3 w-3" /> Dépendances externes
              </h2>
              <WidgetDependencyHealthGrid dependencies={overview.data!.dependencies} />
            </section>

            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Bot className="h-3 w-3" /> Agents internes
              </h2>
              <PanelAgentExecutionMap agents={agents.data!} />
            </section>
          </>
        )}

        <div className="text-center pt-2">
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to="/admin/outbound/runs">← Retour Pipeline Live</Link>
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
