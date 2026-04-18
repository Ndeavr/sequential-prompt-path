import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import type { PipelineRunTransition } from "@/services/pipelineCommandCenterService";

export default function PanelStepExecutionLogs({ transitions }: { transitions: PipelineRunTransition[] }) {
  const withPayload = transitions.filter(t => t.payload && Object.keys(t.payload).length > 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" /> Logs d'exécution
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {withPayload.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 px-4">Aucun payload de log enregistré</p>
        ) : (
          <div className="divide-y max-h-[400px] overflow-auto">
            {withPayload.map(t => (
              <details key={t.id} className="p-3">
                <summary className="text-xs font-medium cursor-pointer">
                  {t.to_stage ?? "—"} <span className="text-muted-foreground">·</span> {new Date(t.created_at).toLocaleTimeString("fr-CA")}
                </summary>
                <pre className="mt-2 text-[10px] bg-muted/40 p-2 rounded overflow-auto max-h-48">
                  {JSON.stringify(t.payload, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
