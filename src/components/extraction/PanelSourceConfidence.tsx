import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SourceField {
  id: string;
  field_name: string;
  field_value_text: string | null;
  source_name: string;
  confidence_score: number;
  is_selected: boolean;
}

interface Props {
  fields: SourceField[];
  onSelectField?: (fieldId: string) => void;
}

export default function PanelSourceConfidence({ fields, onSelectField }: Props) {
  const grouped = fields.reduce<Record<string, SourceField[]>>((acc, f) => {
    (acc[f.field_name] ??= []).push(f);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sources & Confiance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(grouped).map(([fieldName, sources]) => (
          <div key={fieldName} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{fieldName}</p>
            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectField?.(s.id)}
                className={`w-full text-left p-2 rounded-lg border transition-colors ${
                  s.is_selected
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/50 hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground truncate">{s.field_value_text || "—"}</span>
                  <span className="text-[10px] text-muted-foreground">{s.source_name}</span>
                </div>
                <Progress value={s.confidence_score * 100} className="h-1" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{Math.round(s.confidence_score * 100)}% confiance</p>
              </button>
            ))}
          </div>
        ))}
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Aucune source disponible</p>
        )}
      </CardContent>
    </Card>
  );
}
