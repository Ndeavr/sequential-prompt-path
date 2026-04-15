import { Loader2, Zap, PlayCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useEmailWarmupSchedule, useInitWarmup } from "@/hooks/useEmailProductionControl";

const PageAdminEmailWarmup = () => {
  const { data: warmup, isLoading } = useEmailWarmupSchedule();
  const initMutation = useInitWarmup();
  const today = new Date().toISOString().split("T")[0];

  const handleInit = () => {
    initMutation.mutate("mail.unpro.ca", {
      onSuccess: () => toast.success("Warmup initialisé — 10 jours"),
      onError: () => toast.error("Erreur"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Email Warmup Scheduler</h1>
            <p className="text-sm text-muted-foreground">Progression du warmup mail.unpro.ca</p>
          </div>
          <Button size="sm" onClick={handleInit} disabled={initMutation.isPending} className="gap-1.5">
            {initMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            Reset warmup
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : warmup && warmup.length > 0 ? (
          <div className="space-y-3">
            {warmup.map((w: any) => {
              const isToday = w.scheduled_date === today;
              const pct = w.max_emails > 0 ? (w.sent_count / w.max_emails) * 100 : 0;
              const done = w.sent_count >= w.max_emails;
              return (
                <div key={w.id} className={`rounded-xl border p-4 space-y-2 ${isToday ? "border-primary/30 bg-primary/5" : "border-border/30 bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isToday ? <PlayCircle className="h-4 w-4 text-primary" /> : done ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Zap className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm font-semibold text-foreground">Jour {w.day_number}</span>
                      {isToday && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Aujourd'hui</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{w.sent_count} / {w.max_emails}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-[11px] text-muted-foreground">{w.scheduled_date}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <Zap className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Aucun warmup planifié</p>
            <Button onClick={handleInit} className="gap-2">
              <PlayCircle className="h-4 w-4" /> Démarrer le warmup
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageAdminEmailWarmup;
