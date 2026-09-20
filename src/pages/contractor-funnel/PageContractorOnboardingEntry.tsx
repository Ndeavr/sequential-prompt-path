/**
 * UNPRO — Entrée unique du parcours entrepreneur (/entrepreneur/onboarding).
 *
 * Par défaut : l'analyse d'entreprise (recherche réelle + préremplissage), qui
 * enchaîne ensuite objectifs → plan personnalisé → paiement.
 * Repli explicite : `?mode=formulaire` ouvre le formulaire d'adhésion manuel.
 *
 * Une seule route, un seul parcours : aucune destination parallèle.
 */
import { useSearchParams } from "react-router-dom";
import PageContractorPricingIntake from "./PageContractorPricingIntake";
import PageContractorOnboardingStart from "./PageContractorOnboardingStart";

export default function PageContractorOnboardingEntry() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  if (mode === "formulaire") return <PageContractorOnboardingStart />;
  return <PageContractorPricingIntake />;
}
