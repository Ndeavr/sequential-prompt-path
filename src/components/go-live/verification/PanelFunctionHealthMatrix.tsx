import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FunctionHealth {
  function_name: string;
  http_status: number | null;
  latency_ms: number | null;
  health_status: string;
  response_excerpt: string | null;
  checked_at: string;
}

interface PanelFunctionHealthMatrixProps {
  functions: FunctionHealth[];
  onTest: (name: string) => void;
  testing?: string | null;
}

export default function PanelFunctionHealthMatrix({ functions, onTest, testing }: PanelFunctionHealthMatrixProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Edge Functions Health</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {functions.map((fn) => {
            const ok = fn.health_status === "healthy";
            const isRunning = testing === fn.function_name;
            return (
              <div key={fn.function_name} className="flex items-center gap-3 p-2 rounded bg-muted/30 text-xs">
                {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                <span className="font-mono flex-1 truncate">{fn.function_name}</span>
                {fn.http_status && <Badge variant="outline" className="text-[10px]">{fn.http_status}</Badge>}
                {fn.latency_ms != null && (
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <Clock className="h-3 w-3" />{fn.latency_ms}ms
                  </span>
                )}
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => onTest(fn.function_name)} disabled={isRunning}>
                  {isRunning ? "…" : "Test"}
                </Button>
              </div>
            );
          })}
          {functions.length === 0 && <p className="text-muted-foreground text-center py-4 text-xs">Aucun test exécuté</p>}
        </div>
      </CardContent>
    </Card>
  );
}
