import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";

interface AIPPSnapshot {
  score_global: number;
  score_visibility: number;
  score_conversion: number;
  score_structure: number;
  score_authority: number;
  score_trust: number;
  score_brand: number;
  score_content: number;
  money_left_on_table_estimate: number;
  weaknesses_json?: any[];
  opportunities_json?: any[];
}

const SCORES = [
  { key: "score_visibility", label: "Visibilité" },
  { key: "score_conversion", label: "Conversion" },
  { key: "score_structure", label: "Structure" },
  { key: "score_authority", label: "Autorité" },
  { key: "score_trust", label: "Confiance" },
  { key: "score_brand", label: "Marque" },
  { key: "score_content", label: "Contenu" },
] as const;

export default function PanelAIPPScorePreview({ snapshot }: { snapshot: AIPPSnapshot | null }) {
  if (!snapshot) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Score AIPP</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">En attente du scoring…</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Score AIPP — {snapshot.score_global}/100
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {SCORES.map(({ key, label }) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span>{label}</span>
              <span className="text-muted-foreground">{(snapshot as any)[key]}/100</span>
            </div>
            <Progress value={(snapshot as any)[key]} className="h-2" />
          </div>
        ))}
        {snapshot.money_left_on_table_estimate > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-xs font-medium text-warning">
              💰 Manque à gagner estimé : {snapshot.money_left_on_table_estimate.toLocaleString("fr-CA")} $/an
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
