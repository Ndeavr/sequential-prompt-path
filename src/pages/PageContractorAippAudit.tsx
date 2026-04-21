import { useParams } from "react-router-dom";
import { useContractorAippAudit, useLaunchAippAudit } from "@/hooks/useContractorAippAudit";
import AippAuditExperience from "@/components/aipp-real/AippAuditExperience";

export default function PageContractorAippAudit() {
  const { contractorId } = useParams<{ contractorId: string }>();
  const { model, loading, error, refetch } = useContractorAippAudit(contractorId);
  const { launch, launching } = useLaunchAippAudit();

  const handleLaunch = async () => {
    if (!contractorId) return;
    await launch(contractorId);
    refetch();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">{error || "Erreur de chargement"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AippAuditExperience model={model} onLaunchAudit={handleLaunch} launching={launching} />
    </div>
  );
}
