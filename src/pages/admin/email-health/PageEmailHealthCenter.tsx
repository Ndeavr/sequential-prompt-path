/**
 * UNPRO — Email Health Center Dashboard
 */
import { useEffect } from "react";
import { Loader2, PlayCircle, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useEmailSystemStatus,
  useEmailChecks,
  useEmailAlerts,
  useDomainSnapshots,
  useEmailTestRuns,
  useRunEmailAudit,
} from "@/hooks/useEmailHealthCenter";
import HeroSectionEmailHealthStatus from "@/components/email-health/HeroSectionEmailHealthStatus";
import TableEmailConfigurationChecks from "@/components/email-health/TableEmailConfigurationChecks";
import CardDomainHealth from "@/components/email-health/CardDomainHealth";
import BannerConfigurationActionRequired from "@/components/email-health/BannerConfigurationActionRequired";
import TimelineEmailEventFlow from "@/components/email-health/TimelineEmailEventFlow";

const PageEmailHealthCenter = () => {
  const { data: status, isLoading: statusLoading } = useEmailSystemStatus();
  const { data: checks } = useEmailChecks();
  const { data: alerts } = useEmailAlerts();
  const { data: domains } = useDomainSnapshots();
  const { data: testRuns } = useEmailTestRuns();
  const auditMutation = useRunEmailAudit();

  // Auto-run audit on first load if no checks exist
  useEffect(() => {
    if (checks && checks.length === 0 && !auditMutation.isPending) {
      auditMutation.mutate();
    }
  }, [checks]);

  const handleAudit = () => {
    auditMutation.mutate(undefined, {
      onSuccess: () => toast.success("Audit terminé"),
      onError: () => toast.error("Erreur lors de l'audit"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <HeroSectionEmailHealthStatus status={status} isLoading={statusLoading || auditMutation.isPending} />

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleAudit} disabled={auditMutation.isPending} className="gap-2 flex-1">
            {auditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Lancer audit
          </Button>
          <Button variant="outline" className="gap-2 flex-1" onClick={() => toast.info("Test d'envoi en développement")}>
            <SendHorizonal className="h-4 w-4" />
            Test réel
          </Button>
        </div>

        {/* Alerts */}
        <BannerConfigurationActionRequired alerts={alerts || []} />

        {/* Success banner */}
        {status?.status === "active" && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm font-medium text-emerald-600">Système email entièrement opérationnel</p>
          </div>
        )}

        {/* Configuration checks */}
        <div className="rounded-xl border border-border/30 bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Vérifications de configuration</h2>
          <TableEmailConfigurationChecks checks={checks || []} />
        </div>

        {/* Domain health */}
        {domains && domains.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Santé des domaines</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {domains.map((d) => (
                <CardDomainHealth key={d.id} snapshot={d} />
              ))}
            </div>
          </div>
        )}

        {/* Live events */}
        <div className="rounded-xl border border-border/30 bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Événements récents</h2>
          <TimelineEmailEventFlow events={[]} />
        </div>
      </div>
    </div>
  );
};

export default PageEmailHealthCenter;
