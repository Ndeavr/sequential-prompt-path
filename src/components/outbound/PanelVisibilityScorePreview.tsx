import { Progress } from "@/components/ui/progress";

interface ScoreData {
  score_total: number;
  score_ai_search: number;
  score_local_presence: number;
  score_reviews: number;
  score_schema: number;
  score_content: number;
  score_conversion: number;
  score_trust: number;
  summary_short?: string | null;
}

const categories = [
  { key: "score_ai_search", label: "Recherche IA" },
  { key: "score_local_presence", label: "Présence locale" },
  { key: "score_reviews", label: "Avis" },
  { key: "score_schema", label: "Schema / SEO technique" },
  { key: "score_content", label: "Contenu" },
  { key: "score_conversion", label: "Conversion" },
  { key: "score_trust", label: "Confiance" },
] as const;

function scoreColor(v: number) {
  if (v >= 70) return "text-green-500";
  if (v >= 40) return "text-yellow-500";
  return "text-destructive";
}

interface Props {
  score: ScoreData | null;
  prospectName?: string;
}

export default function PanelVisibilityScorePreview({ score, prospectName }: Props) {
  if (!score) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        Aucun score de visibilité disponible
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Score Visibilité IA</h4>
        <span className={`text-2xl font-bold ${scoreColor(Number(score.score_total))}`}>
          {Math.round(Number(score.score_total))}<span className="text-sm font-normal text-muted-foreground">/100</span>
        </span>
      </div>

      {score.summary_short && (
        <p className="text-xs text-muted-foreground">{score.summary_short}</p>
      )}

      <div className="space-y-2">
        {categories.map(({ key, label }) => {
          const val = Number((score as any)[key] ?? 0);
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className={scoreColor(val)}>{Math.round(val)}</span>
              </div>
              <Progress value={val} className="h-1.5" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
