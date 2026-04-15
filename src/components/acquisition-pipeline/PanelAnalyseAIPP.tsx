import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react";

interface Insights {
  forces: string[];
  faiblesses: string[];
  opportunites: string[];
}

export default function PanelAnalyseAIPP({ insights }: { insights: Insights | null }) {
  if (!insights) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Analyse AIPP</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune analyse disponible.</p>
        </CardContent>
      </Card>
    );
  }

  const forces = Array.isArray(insights.forces) ? insights.forces : [];
  const faiblesses = Array.isArray(insights.faiblesses) ? insights.faiblesses : [];
  const opportunites = Array.isArray(insights.opportunites) ? insights.opportunites : [];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Analyse AIPP</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {forces.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-400">Forces</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {forces.map((f, i) => (
                <Badge key={i} variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">{String(f)}</Badge>
              ))}
            </div>
          </div>
        )}
        {faiblesses.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs font-medium text-red-400">Faiblesses</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {faiblesses.map((f, i) => (
                <Badge key={i} variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">{String(f)}</Badge>
              ))}
            </div>
          </div>
        )}
        {opportunites.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">Opportunités</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {opportunites.map((f, i) => (
                <Badge key={i} variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">{String(f)}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
