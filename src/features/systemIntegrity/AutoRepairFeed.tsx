/**
 * AutoRepairFeed — Recent auto-repair attempts.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatQcDateTime } from "@/lib/time/timezone";

interface Attempt {
  id: string;
  target: string;
  check_type: string;
  status: string;
  latency_ms: number | null;
  error_message: string | null;
  attempted_at: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  healthy: "default",
  repaired: "default",
  degraded: "secondary",
  failed: "destructive",
  unrepairable: "destructive",
};

export function AutoRepairFeed({ attempts }: { attempts: Attempt[] | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-Repair — dernières vérifications</CardTitle>
      </CardHeader>
      <CardContent>
        {!attempts || attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vérification pour le moment.</p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-auto">
            {attempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{a.target}</span>
                    <Badge variant={STATUS_VARIANT[a.status] ?? "outline"} className="text-[10px]">
                      {a.status}
                    </Badge>
                    {a.latency_ms != null && (
                      <span className="text-xs text-muted-foreground tabular-nums">{a.latency_ms} ms</span>
                    )}
                  </div>
                  {a.error_message && (
                    <p className="text-xs text-destructive truncate">{a.error_message}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatQcDateTime(a.attempted_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
