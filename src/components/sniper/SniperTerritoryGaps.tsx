import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle } from "lucide-react";

interface TerritoryGap {
  city: string;
  category: string;
  targetCount: number;
  enrichedCount: number;
  convertedCount: number;
  gapScore: number;
}

export function SniperTerritoryGaps({ targets }: { targets: any[] }) {
  // Group by city × category
  const groups = new Map<string, TerritoryGap>();
  for (const t of targets) {
    const key = `${t.city || "Inconnue"}|${t.category || "Général"}`;
    if (!groups.has(key)) {
      groups.set(key, {
        city: t.city || "Inconnue",
        category: t.category || "Général",
        targetCount: 0,
        enrichedCount: 0,
        convertedCount: 0,
        gapScore: 0,
      });
    }
    const g = groups.get(key)!;
    g.targetCount++;
    if (t.enrichment_status === "enriched") g.enrichedCount++;
    if (t.outreach_status === "converted") g.convertedCount++;
  }

  // Compute gap scores
  const rows = Array.from(groups.values()).map(g => ({
    ...g,
    gapScore: Math.round(Math.max(0, (g.targetCount - g.convertedCount * 5) * (g.enrichedCount > 0 ? 1.5 : 1))),
  })).sort((a, b) => b.gapScore - a.gapScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Opportunités territoriales
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Aucune donnée territoriale disponible.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ville</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Cibles</TableHead>
                <TableHead>Enrichies</TableHead>
                <TableHead>Convertis</TableHead>
                <TableHead>Score gap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.city}-${r.category}`}>
                  <TableCell className="font-medium">{r.city}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>{r.targetCount}</TableCell>
                  <TableCell>{r.enrichedCount}</TableCell>
                  <TableCell>{r.convertedCount}</TableCell>
                  <TableCell>
                    <Badge variant={r.gapScore > 10 ? "destructive" : "outline"} className="text-xs">
                      {r.gapScore > 10 && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {r.gapScore}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
