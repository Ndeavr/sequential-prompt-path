/**
 * UNPRO — Territory Gap Panel
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TerritoryGapRow } from "@/services/dynamicPricingEngine";

export default function TerritoryGapPanel({ rows }: { rows: TerritoryGapRow[] }) {
  if (rows.length === 0) return (
    <div className="rounded-xl border border-border/20 bg-card/20 p-6 text-center text-sm text-muted-foreground">
      Aucune donnée territoriale.
    </div>
  );

  return (
    <div className="rounded-xl border border-border/20 bg-card/20 backdrop-blur-sm">
      <div className="px-4 py-3 border-b border-border/10">
        <span className="text-sm font-semibold">Territoires — Gaps</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-[10px] uppercase">
              <TableHead>Ville</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead className="text-right">Actifs</TableHead>
              <TableHead className="text-right">Cible</TableHead>
              <TableHead className="text-right">Gap</TableHead>
              <TableHead className="text-right">Chauds</TableHead>
              <TableHead className="text-right">Convertis</TableHead>
              <TableHead className="text-right">Fondateur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 20).map((r, i) => (
              <TableRow key={i} className="text-xs">
                <TableCell className="font-medium">{r.city}</TableCell>
                <TableCell>{r.category}</TableCell>
                <TableCell className="text-right">{r.activeCount}</TableCell>
                <TableCell className="text-right">{r.targetCount}</TableCell>
                <TableCell className="text-right">
                  <span className={r.gap >= 5 ? "text-red-400 font-semibold" : r.gap >= 3 ? "text-orange-400" : "text-foreground"}>
                    {r.gap}
                  </span>
                </TableCell>
                <TableCell className="text-right">{r.hotLeads}</TableCell>
                <TableCell className="text-right">{r.conversions}</TableCell>
                <TableCell className="text-right">{r.founderSlotsRemaining ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
