/**
 * /pro/activate — ancienne page « Fondateur 149 $/mois » retirée.
 * Redirige vers le parcours entrepreneur canonique (activation 350 $ unique),
 * en conservant les paramètres d'attribution (ref, utm, prospect…).
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildContractorEntryUrl } from "@/config/contractorFunnel";
import { Skeleton } from "@/components/ui/skeleton";

export default function PageProActivate() {
  const navigate = useNavigate();
  useEffect(() => {
    const extra: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((v, k) => { extra[k] = v; });
    navigate(buildContractorEntryUrl(extra, "/entrepreneur/devis-personnalise"), { replace: true });
  }, [navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Skeleton className="h-96 w-full max-w-lg rounded-2xl" />
    </div>
  );
}
