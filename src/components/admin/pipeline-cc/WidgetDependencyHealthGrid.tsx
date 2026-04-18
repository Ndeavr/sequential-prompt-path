import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server } from "lucide-react";
import BadgeDependencyState from "./BadgeDependencyState";
import type { PipelineDependency } from "@/services/pipelineCommandCenterService";

export default function WidgetDependencyHealthGrid({ dependencies }: { dependencies: PipelineDependency[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" /> Santé des dépendances
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dependencies.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune dépendance détectée</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {dependencies.map(d => (
              <div key={d.dependency_key} className="p-2 rounded-lg border bg-card/40">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-medium truncate">{d.dependency_name}</span>
                  <BadgeDependencyState status={d.status} />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {d.incidents_24h > 0 ? `${d.incidents_24h} incident${d.incidents_24h > 1 ? "s" : ""} 24h` : "Stable"}
                  {d.avg_latency_ms != null && ` · ${d.avg_latency_ms}ms`}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
