import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Globe, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { fetchGeneratedPages, type GeneratedPage } from "@/services/automationService";

const statusStyles: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  draft: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  generated: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  archived: "bg-muted text-muted-foreground border-border",
  error: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function GeneratedPagesPanel() {
  const { data: pages = [], isLoading } = useQuery<GeneratedPage[]>({
    queryKey: ["generated-pages"],
    queryFn: () => fetchGeneratedPages(200),
    staleTime: 15_000,
  });

  const published = pages.filter(p => p.status === "published").length;
  const drafts = pages.filter(p => p.status === "draft" || p.status === "generated").length;
  const avgQuality = pages.length > 0
    ? Math.round(pages.reduce((s, p) => s + (p.quality_score ?? 0), 0) / pages.length)
    : 0;

  const summary = [
    { label: "Publiées", value: published, icon: Globe, color: "text-emerald-500" },
    { label: "Brouillons", value: drafts, icon: Clock, color: "text-amber-500" },
    { label: "Qualité moy.", value: avgQuality, icon: CheckCircle2, color: "text-primary" },
    { label: "Total", value: pages.length, icon: FileText, color: "text-blue-500" },
  ];

  if (isLoading) return <div className="flex justify-center py-12 text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summary.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/40">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 shrink-0 ${color}`} />
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pages.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">Aucune page générée encore</p>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Slug</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Type</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Ville</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Agent</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
                <TableHead className="text-xs text-center hidden sm:table-cell">Qualité</TableHead>
                <TableHead className="text-xs text-center hidden md:table-cell">SEO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="p-2 text-sm font-mono max-w-[200px] truncate">{p.slug ?? "—"}</TableCell>
                  <TableCell className="p-2 text-xs hidden sm:table-cell text-muted-foreground">{p.page_type ?? "—"}</TableCell>
                  <TableCell className="p-2 text-xs hidden md:table-cell">{p.city ?? "—"}</TableCell>
                  <TableCell className="p-2 text-xs hidden lg:table-cell text-muted-foreground font-mono">{p.source_agent_key ?? "—"}</TableCell>
                  <TableCell className="p-2">
                    <Badge variant="outline" className={`text-[10px] ${statusStyles[p.status ?? ""] ?? ""}`}>{p.status ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="p-2 text-xs text-center hidden sm:table-cell">
                    <span className={`font-bold ${(p.quality_score ?? 0) >= 70 ? "text-emerald-500" : (p.quality_score ?? 0) >= 40 ? "text-amber-500" : "text-destructive"}`}>
                      {p.quality_score ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="p-2 text-xs text-center hidden md:table-cell">{p.seo_score ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
