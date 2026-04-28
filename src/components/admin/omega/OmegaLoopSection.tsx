/**
 * UNPRO Omega — Loop / Expansion / Churn cards
 * Mounted inside /admin/omega. Reads live data from omega_loop_runs,
 * expansion_opportunities, churn_signals. Admin-only via RLS.
 */
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useOmegaLoopToday,
  useExpansionQueue,
  useChurnQueue,
  useTriggerPhase,
  ALL_PHASES,
  PHASE_LABELS,
  type OmegaPhase,
} from "@/hooks/useOmegaLoop";
import { Activity, TrendingUp, ShieldAlert, Play } from "lucide-react";

const StatusDot = ({ status }: { status?: string }) => {
  const color =
    status === "success" ? "bg-emerald-400" :
    status === "running" ? "bg-amber-400 animate-pulse" :
    status === "failed" ? "bg-red-400" :
    "bg-white/20";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
};

const Section = ({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
    <div className="mb-3 flex items-center gap-2">
      <div className="text-primary">{icon}</div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
    </div>
    {children}
  </div>
);

const TodaysLoopCard = () => {
  const { data: runs, isLoading } = useOmegaLoopToday();
  const trigger = useTriggerPhase();
  const { toast } = useToast();

  const byPhase: Partial<Record<OmegaPhase, { status: string }>> = {};
  for (const r of runs ?? []) byPhase[r.phase] = { status: r.status };

  const handleRun = (phase: OmegaPhase) => {
    trigger.mutate(phase, {
      onSuccess: () => toast({ title: `Phase ${PHASE_LABELS[phase]} lancée` }),
      onError: (e: unknown) => toast({
        title: "Échec du déclenchement",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      }),
    });
  };

  return (
    <Section icon={<Activity className="h-4 w-4" />} title="Boucle d'aujourd'hui">
      <div className="space-y-2">
        {ALL_PHASES.map((p) => {
          const run = byPhase[p];
          return (
            <div key={p} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-3 min-w-0">
                <StatusDot status={run?.status} />
                <span className="truncate text-xs">{PHASE_LABELS[p]}</span>
              </div>
              <div className="flex items-center gap-2">
                {run?.status && (
                  <Badge variant="outline" className="border-white/10 text-[10px]">
                    {run.status}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  disabled={trigger.isPending}
                  onClick={() => handleRun(p)}
                >
                  <Play className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
        {isLoading && <div className="text-xs text-muted-foreground">Chargement...</div>}
        {!isLoading && (runs?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-muted-foreground">
            Aucune phase exécutée aujourd'hui. Cron démarre à 05:00.
          </div>
        )}
      </div>
    </Section>
  );
};

const ExpansionCard = () => {
  const { data, isLoading } = useExpansionQueue();
  return (
    <Section icon={<TrendingUp className="h-4 w-4" />} title="Expansion prête">
      <div className="space-y-2">
        {(data ?? []).map((opp) => (
          <div key={opp.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-medium">{opp.contractor_id.slice(0, 8)}</div>
              <div className="text-[10px] text-muted-foreground">
                {opp.current_plan} → {opp.recommended_plan}
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-400/30 text-[10px] text-emerald-300">
              prêt
            </Badge>
          </div>
        ))}
        {isLoading && <div className="text-xs text-muted-foreground">Chargement...</div>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-muted-foreground">
            Aucune opportunité d'expansion détectée.
          </div>
        )}
      </div>
    </Section>
  );
};

const ChurnCard = () => {
  const { data, isLoading } = useChurnQueue();
  const sevColor: Record<string, string> = {
    critical: "border-red-400/40 text-red-300",
    high: "border-orange-400/40 text-orange-300",
    medium: "border-amber-400/40 text-amber-300",
    low: "border-white/20 text-muted-foreground",
  };
  const sigLabel: Record<string, string> = {
    payment_failed: "Paiement échoué",
    inactive_login: "Inactif",
    no_leads_opened: "Aucun lead ouvert",
    downgrade_intent: "Intent baisse",
  };
  return (
    <Section icon={<ShieldAlert className="h-4 w-4" />} title="Sauvetage churn">
      <div className="space-y-2">
        {(data ?? []).map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-medium">{s.contractor_id.slice(0, 8)}</div>
              <div className="text-[10px] text-muted-foreground">{sigLabel[s.signal_type] ?? s.signal_type}</div>
            </div>
            <Badge variant="outline" className={`text-[10px] ${sevColor[s.severity] ?? sevColor.low}`}>
              {s.severity}
            </Badge>
          </div>
        ))}
        {isLoading && <div className="text-xs text-muted-foreground">Chargement...</div>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-muted-foreground">
            Aucun signal de churn ouvert.
          </div>
        )}
      </div>
    </Section>
  );
};

export const OmegaLoopSection = () => (
  <div className="grid gap-3 md:grid-cols-3">
    <TodaysLoopCard />
    <ExpansionCard />
    <ChurnCard />
  </div>
);
