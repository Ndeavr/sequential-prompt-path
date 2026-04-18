import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw, CheckCircle2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { PipelineOpenBlocker } from "@/services/pipelineCommandCenterService";
import { useResolveBlocker } from "@/hooks/usePipelineCommandCenter";

const sevCls: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300 border-red-500/30",
  high:     "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium:   "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low:      "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

interface Props {
  blockers: PipelineOpenBlocker[];
  onRetry?: (b: PipelineOpenBlocker) => void;
  showResolve?: boolean;
  showRunLink?: boolean;
}

export default function TableBlockedItemsRecovery({ blockers, onRetry, showResolve = true, showRunLink = true }: Props) {
  const resolve = useResolveBlocker();

  const handleResolve = async (id: string) => {
    try {
      const r = await resolve.mutateAsync({ id });
      if ((r as any)?.error) toast.error("Résolution échouée", { description: (r as any).error });
      else toast.success("Blocage résolu");
    } catch (e: any) {
      toast.error("Résolution échouée", { description: e?.message });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" /> Blocages ouverts
        </CardTitle>
        <span className="text-xs text-muted-foreground">{blockers.length}</span>
      </CardHeader>
      <CardContent className="p-0">
        {blockers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-4">Aucun blocage ouvert ✓</p>
        ) : (
          <div className="divide-y">
            {blockers.map(b => (
              <div key={b.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn("text-[10px]", sevCls[b.severity_level] ?? sevCls.medium)}>
                        {b.severity_level}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{b.engine_name}</span>
                    </div>
                    <p className="text-sm font-medium mt-1 line-clamp-2">{b.blocker_title}</p>
                    {b.blocker_message && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{b.blocker_message}</p>
                    )}
                    {b.suggested_resolution && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        💡 {b.suggested_resolution}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {showRunLink && b.run_id && (
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link to={`/admin/outbound/runs/${b.run_id}`}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Run
                      </Link>
                    </Button>
                  )}
                  {b.retry_possible && onRetry && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRetry(b)}>
                      <RotateCw className="h-3 w-3 mr-1" /> Retry
                    </Button>
                  )}
                  {showResolve && (
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      disabled={resolve.isPending}
                      onClick={() => handleResolve(b.id)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Résoudre
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
