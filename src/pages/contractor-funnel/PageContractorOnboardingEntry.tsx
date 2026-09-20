/**
 * UNPRO — Entrée unique du parcours entrepreneur (/entrepreneur/onboarding).
 *
 * Par défaut : l'analyse d'entreprise (recherche réelle + préremplissage), qui
 * enchaîne ensuite objectifs → plan personnalisé → paiement.
 * Repli explicite : `?mode=formulaire` ouvre le formulaire d'adhésion manuel.
 *
 * Une seule route, un seul parcours : aucune destination parallèle.
 */
import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

const PricingIntake = lazy(() => import("./PageContractorPricingIntake"));
const OnboardingForm = lazy(() => import("./PageContractorOnboardingStart"));

function Loading() {
  return (
    <div className="min-h-[60dvh] flex items-center justify-center bg-[#050816]">
      <Loader2 className="w-5 h-5 animate-spin text-white/60" />
    </div>
  );
}

export default function PageContractorOnboardingEntry() {
  const [searchParams] = useSearchParams();
  const manual = searchParams.get("mode") === "formulaire";

  return (
    <Suspense fallback={<Loading />}>
      {manual ? <OnboardingForm /> : <PricingIntake />}
    </Suspense>
  );
}
