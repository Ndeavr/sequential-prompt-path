import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";
import { Loader2 } from "lucide-react";

export default function StepActivate() {
  const { report } = useScanWizardState();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams();
    if (report?.id) params.set("report", report.id);
    navigate(`/entrepreneur/devis-personnalise${params.size ? `?${params}` : ""}`, { replace: true });
  }, [navigate, report?.id]);
  return (
    <WizardShell hidePrimary>
      <div className="flex-1 flex items-center justify-center gap-3 text-white/70">
        <Loader2 className="h-5 w-5 animate-spin" /> Préparation de votre devis personnalisé…
      </div>
    </WizardShell>
  );
}
