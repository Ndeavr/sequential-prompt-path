import { useState, useMemo } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { ArrowLeft, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useOpenBlockers } from "@/hooks/usePipelineCommandCenter";
import TableBlockedItemsRecovery from "@/components/admin/pipeline-cc/TableBlockedItemsRecovery";

const SEVERITIES = ["all", "critical", "high", "medium", "low"] as const;

export default function PageBlockedItemsRecoveryQueue() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useOpenBlockers(200);
  const [sev, setSev] = useState<typeof SEVERITIES[number]>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(b => {
      if (sev !== "all" && b.severity_level !== sev) return false;
      if (q && !`${b.blocker_title} ${b.blocker_message ?? ""} ${b.engine_name}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, sev, q]);

  return (
    <AdminLayout>
      <div className="space-y-3 p-3 md:p-6 max-w-4xl mx-auto pb-20">
        <header className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-xl font-bold font-display flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="truncate">File de récupération</span>
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {data?.length ?? 0} blocage{(data?.length ?? 0) > 1 ? "s" : ""} ouvert{(data?.length ?? 0) > 1 ? "s" : ""}
            </p>
          </div>
        </header>

        {/* Filtres */}
        <div className="space-y-2 sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
          <Input
            placeholder="Recherche titre, moteur, message…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 text-sm"
          />
          <div className="flex gap-1 flex-wrap">
            {SEVERITIES.map(s => (
              <Button
                key={s}
                size="sm"
                variant={sev === s ? "default" : "outline"}
                onClick={() => setSev(s)}
                className="h-7 text-[11px] px-2"
              >
                {s === "all" ? "Tous" : s}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : isError ? (
          <Card>
            <CardContent className="p-6 text-center">
              <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Erreur de chargement</p>
              <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-3">Réessayer</Button>
            </CardContent>
          </Card>
        ) : (
          <TableBlockedItemsRecovery blockers={filtered} />
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
