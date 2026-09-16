/**
 * UNPRO — Entrée unique du plan personnalisé entrepreneur.
 * Route: /entrepreneur/plan-personnalise (sans identifiant de devis)
 *
 * Aucune grille de prix n'est rendue ici : la page résout le rôle réel puis
 * dirige vers le plan réel de l'entrepreneur (devis existant), vers l'étape
 * manquante de son profil, ou vers les plans Maison si le compte est
 * propriétaire. Aucun prix n'est affiché avant la résolution du rôle.
 */
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useContractorPlanEligibility } from "@/lib/billing/contractorPlanEligibility";
import {
  CONTRACTOR_PLAN_INTAKE_ROUTE,
  HOMEOWNER_PLANS_ROUTE,
  isContractorObjective,
  normalizePlanAudience,
} from "@/lib/routing/contractorPlanRoute";
import { trackFunnelStep } from "@/lib/analytics/funnelSteps";

export default function PageContractorPlanEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, isAuthenticated, isLoading: authLoading, hasResolvedRole } = useAuth();
  const { eligibility, isLoading: eligibilityLoading } = useContractorPlanEligibility("month");

  const rawObjective = searchParams.get("objective");
  const objective = isContractorObjective(rawObjective) ? rawObjective : null;
  const from = searchParams.get("from");

  const audience = normalizePlanAudience(role);
  const resolvingRole = authLoading || (isAuthenticated && !hasResolvedRole);
  const waiting = resolvingRole || (isAuthenticated && eligibilityLoading);

  useEffect(() => {
    if (waiting) return;

    // Contexte conservé tel quel (promo, ref, source, attribution).
    const carry = new URLSearchParams(searchParams);
    const qs = carry.toString();

    if (isAuthenticated && audience === "homeowner") {
      navigate(HOMEOWNER_PLANS_ROUTE, { replace: true });
      return;
    }

    if (isAuthenticated && eligibility && eligibility.mode !== "custom_only") {
      void trackFunnelStep("plan_presented", {
        subjectId: eligibility.quoteId,
        metadata: { objective, from, entry: "contractor_plan_entry" },
      });
      navigate(
        `/entrepreneur/plan-personnalise/${eligibility.quoteId}${qs ? `?${qs}` : ""}`,
        { replace: true },
      );
      return;
    }

    // Aucun devis exploitable (ou visiteur non connecté) : on complète d'abord
    // les informations réellement manquantes, puis le plan est recalculé.
    navigate(`${CONTRACTOR_PLAN_INTAKE_ROUTE}${qs ? `?${qs}` : ""}`, { replace: true });
  }, [waiting, isAuthenticated, audience, eligibility, navigate, searchParams, objective, from]);

  return (
    <>
      <Helmet>
        <title>Mon plan personnalisé | UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <main className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground" role="status">
          Préparation de votre plan personnalisé…
        </p>
      </main>
    </>
  );
}
