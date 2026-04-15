import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, Search, Filter, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useRecruitmentProspects } from "@/hooks/useRecruitmentProspects";
import { useExtractionMonitor } from "@/hooks/useRecruitmentCommandCenter";
import { Helmet } from "react-helmet-async";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  enriched: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-destructive/20 text-destructive",
  partial: "bg-blue-500/20 text-blue-400",
};

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  enriched: CheckCircle2,
  failed: XCircle,
  partial: AlertTriangle,
};

export default function PageAdminDataExtractionMonitor() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { prospects } = useRecruitmentProspects({
    search: search || undefined,
    qualification_status: statusFilter,
  });
  const { data: stats, isLoading: statsLoading } = useExtractionMonitor();

  return (
    <AdminLayout>
      <Helmet><title>Moniteur d'Extraction — UNPRO</title></Helmet>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Moniteur d'Extraction</h1>
          <p className="text-sm text-muted-foreground">Suivi temps réel des données extraites (RBQ, NEQ, GMB, Web)</p>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: "Total extraits", v: stats?.total ?? 0, icon: Database, c: "bg-primary/20 text-primary" },
              { l: "Enrichis", v: stats?.enriched ?? 0, icon: CheckCircle2, c: "bg-emerald-500/20 text-emerald-400" },
              { l: "En attente", v: stats?.pending ?? 0, icon: Clock, c: "bg-amber-500/20 text-amber-400" },
              { l: "Échoués", v: stats?.failed ?? 0, icon: XCircle, c: "bg-destructive/20 text-destructive" },
            ].map(s => (
              <Card key={s.l} className="border-border/40 bg-card/60">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.c}`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{s.v}</p>
                    <p className="text-[10px] text-muted-foreground">{s.l}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Sources breakdown */}
        {stats?.bySources && Object.keys(stats.bySources).length > 0 && (
          <Card className="border-border/40 bg-card/60">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Sources d'extraction</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.bySources).map(([source, count]) => (
                  <Badge key={source} variant="outline" className="text-xs gap-1">
                    {source} <span className="font-bold">{count as number}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter ?? "all"} onValueChange={v => setStatusFilter(v === "all" ? undefined : v)}>
            <SelectTrigger className="w-40"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="qualified">Qualifié</SelectItem>
              <SelectItem value="disqualified">Disqualifié</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Prospects Table */}
        <Card className="border-border/40 bg-card/60 overflow-hidden">
          <CardContent className="p-0">
            {prospects.isLoading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : !prospects.data?.length ? (
              <p className="text-sm text-muted-foreground p-6 text-center">Aucun prospect trouvé</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Entreprise</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Ville</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Source</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Enrichissement</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Confiance</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospects.data.map((p: any) => {
                      const StatusIcon = STATUS_ICONS[p.enrichment_status] || Clock;
                      return (
                        <tr key={p.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <p className="font-medium truncate max-w-[200px]">{p.business_name}</p>
                            {p.email && <p className="text-[10px] text-muted-foreground">{p.email}</p>}
                          </td>
                          <td className="p-3 text-muted-foreground">{p.city ?? "—"}</td>
                          <td className="p-3"><Badge variant="outline" className="text-[10px]">{p.source_name ?? "—"}</Badge></td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-[10px] gap-1 ${STATUS_COLORS[p.enrichment_status] || ""}`}>
                              <StatusIcon className="h-3 w-3" />
                              {p.enrichment_status}
                            </Badge>
                          </td>
                          <td className="p-3">{p.extraction_confidence ? `${Math.round(p.extraction_confidence)}%` : "—"}</td>
                          <td className="p-3 text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString("fr-CA")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
