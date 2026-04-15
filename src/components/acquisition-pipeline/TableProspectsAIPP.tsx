import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Zap, TrendingUp } from "lucide-react";
import type { ProspectWithScore } from "@/hooks/useAcquisitionPipeline";

const statusColors: Record<string, string> = {
  nouveau: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  contacté: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  engagé: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  converti: "bg-primary/20 text-primary border-primary/30",
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  contacted: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function TableProspectsAIPP({
  prospects,
  onSelect,
  onGenerateScore,
  isGenerating,
}: {
  prospects: ProspectWithScore[];
  onSelect: (id: string) => void;
  onGenerateScore: (id: string) => void;
  isGenerating: boolean;
}) {
  if (prospects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Aucun prospect importé</p>
        <p className="text-xs mt-1">Importez des prospects pour démarrer l'acquisition autonome.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entreprise</TableHead>
            <TableHead className="hidden md:table-cell">Ville</TableHead>
            <TableHead className="hidden lg:table-cell">Visibilité</TableHead>
            <TableHead className="hidden lg:table-cell">Conversion</TableHead>
            <TableHead className="hidden lg:table-cell">Confiance</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prospects.map((p) => (
            <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onSelect(p.id)}>
              <TableCell>
                <div>
                  <span className="font-medium text-foreground">{p.business_name || "—"}</span>
                  {p.email && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.email}</p>}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.main_city || "—"}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {p.score ? (
                  <div className="flex items-center gap-2">
                    <ScoreBar value={p.score.score_visibilite} color="bg-blue-500" />
                    <span className="text-xs text-muted-foreground">{p.score.score_visibilite}</span>
                  </div>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {p.score ? (
                  <div className="flex items-center gap-2">
                    <ScoreBar value={p.score.score_conversion} color="bg-amber-500" />
                    <span className="text-xs text-muted-foreground">{p.score.score_conversion}</span>
                  </div>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {p.score ? (
                  <div className="flex items-center gap-2">
                    <ScoreBar value={p.score.score_confiance} color="bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">{p.score.score_confiance}</span>
                  </div>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColors[p.status || "nouveau"] || statusColors.nouveau}>
                  {p.status || "nouveau"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {!p.score && (
                    <Button size="sm" variant="ghost" className="text-xs" disabled={isGenerating} onClick={(e) => { e.stopPropagation(); onGenerateScore(p.id); }}>
                      <Zap className="h-3 w-3 mr-1" />AIPP
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onSelect(p.id); }}>
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
