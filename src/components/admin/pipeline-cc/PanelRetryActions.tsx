import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCw, CheckCircle2 } from "lucide-react";
import { useRetryRun } from "@/hooks/usePipelineCommandCenter";
import { toast } from "sonner";

export default function PanelRetryActions({ runId, status }: { runId: string; status: string }) {
  const retry = useRetryRun();
  const canRetry = ["failed", "blocked", "partial_success", "cancelled"].includes(status);

  const onRetry = async () => {
    try {
      const r = await retry.mutateAsync(runId);
      if ((r as any)?.error) {
        toast.error("Retry échoué", { description: (r as any).error });
      } else {
        toast.success("Retry déclenché", { description: "Le run est remis en file." });
      }
    } catch (e: any) {
      toast.error("Retry échoué", { description: e?.message ?? "Erreur inconnue" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <RotateCw className="h-4 w-4 text-primary" /> Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          onClick={onRetry}
          disabled={!canRetry || retry.isPending}
          variant={canRetry ? "default" : "outline"}
          size="sm"
          className="w-full h-9"
        >
          <RotateCw className={`h-4 w-4 mr-2 ${retry.isPending ? "animate-spin" : ""}`} />
          Relancer le run
        </Button>
        {!canRetry && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Run en bon état — pas d'action requise
          </p>
        )}
      </CardContent>
    </Card>
  );
}
