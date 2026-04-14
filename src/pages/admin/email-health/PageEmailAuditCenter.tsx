/**
 * UNPRO — Email Audit Execution Center
 * Persistent audit runs, real test sends, blocking actions panel
 */
import { useState } from "react";
import { Loader2, PlayCircle, SendHorizonal, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  useLatestAuditRun,
  useAuditRunChecks,
  useLatestTestMessage,
  useActionRecommendations,
  useStartAuditRun,
  useSendTestEmail,
} from "@/hooks/useEmailAuditCenter";
import HeroSectionEmailAuditStatus from "@/components/email-audit/HeroSectionEmailAuditStatus";
import TableAuditChecksExecution from "@/components/email-audit/TableAuditChecksExecution";
import PanelBlockingActionsRequired from "@/components/email-audit/PanelBlockingActionsRequired";
import PanelLastRealTestResult from "@/components/email-audit/PanelLastRealTestResult";
import ModalRealTestRecipient from "@/components/email-audit/ModalRealTestRecipient";

const PageEmailAuditCenter = () => {
  const [testModalOpen, setTestModalOpen] = useState(false);
  const { data: latestRun } = useLatestAuditRun();
  const { data: checks } = useAuditRunChecks(latestRun?.id);
  const { data: lastTest } = useLatestTestMessage();
  const { data: recommendations } = useActionRecommendations();
  const auditMutation = useStartAuditRun();
  const testMutation = useSendTestEmail();

  const handleAudit = () => {
    auditMutation.mutate(undefined, {
      onSuccess: (result) => toast.success(`Audit terminé — Score: ${result.score}%`),
      onError: () => toast.error("Erreur lors de l'audit"),
    });
  };

  const handleTestSend = (email: string) => {
    testMutation.mutate(email, {
      onSuccess: () => {
        toast.success("Test envoyé avec succès");
        setTestModalOpen(false);
      },
      onError: () => toast.error("Erreur lors de l'envoi du test"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Hero — reads from latest persistent run */}
        <HeroSectionEmailAuditStatus
          run={latestRun ?? null}
          isRunning={auditMutation.isPending}
        />

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleAudit} disabled={auditMutation.isPending} className="gap-2 flex-1">
            {auditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            Lancer audit
          </Button>
          <Button variant="outline" className="gap-2 flex-1" onClick={() => setTestModalOpen(true)}>
            <SendHorizonal className="h-4 w-4" />
            Test réel
          </Button>
        </div>

        {/* Last sync info */}
        {latestRun?.finished_at && (
          <p className="text-xs text-muted-foreground text-right">
            Dernier audit : {new Date(latestRun.finished_at).toLocaleString("fr-CA")}
          </p>
        )}

        {/* Blocking actions */}
        <PanelBlockingActionsRequired checks={checks || []} recommendations={recommendations || []} />

        {/* Success banner */}
        {latestRun?.status === "completed" && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm font-medium text-emerald-600">Système email entièrement opérationnel</p>
          </div>
        )}

        {/* Environment badge */}
        {latestRun?.environment === "development" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-xs font-medium text-amber-500">⚠ Mode développement</span>
            <span className="text-xs text-muted-foreground">— Les résultats peuvent différer de la production</span>
          </div>
        )}

        {/* Audit checks */}
        <div className="rounded-xl border border-border/30 bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Vérifications ({checks?.length || 0})
          </h2>
          <TableAuditChecksExecution checks={checks || []} />
        </div>

        {/* Last real test */}
        <PanelLastRealTestResult test={lastTest ?? null} />

        {/* History link */}
        <div className="flex justify-end">
          <Link to="/admin/email-audit-history">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              Historique des audits
            </Button>
          </Link>
        </div>

        {/* Test modal */}
        <ModalRealTestRecipient
          open={testModalOpen}
          onClose={() => setTestModalOpen(false)}
          onSend={handleTestSend}
          isSending={testMutation.isPending}
        />
      </div>
    </div>
  );
};

export default PageEmailAuditCenter;
