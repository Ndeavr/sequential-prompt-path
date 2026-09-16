/**
 * UNPRO — /pricing legacy entry (role-aware).
 *
 * Un entrepreneur connecté n'atterrit jamais sur les plans Maison : il est
 * dirigé vers son plan personnalisé. Tant que le rôle n'est pas résolu, aucune
 * offre tarifaire n'est rendue.
 */
import { Navigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  CONTRACTOR_PLAN_ENTRY_ROUTE,
  HOMEOWNER_PLANS_ROUTE,
  normalizePlanAudience,
} from "@/lib/routing/contractorPlanRoute";

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const { role, isAuthenticated, isLoading, hasResolvedRole } = useAuth();
  const tab = searchParams.get("tab");

  // Build forwarded query (everything except `tab`)
  const forwarded = new URLSearchParams(searchParams);
  forwarded.delete("tab");
  const qs = forwarded.toString();
  const suffix = qs ? `?${qs}` : "";

  if (isLoading || (isAuthenticated && !hasResolvedRole)) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground" role="status">
          Chargement de vos options…
        </p>
      </main>
    );
  }

  const audience = normalizePlanAudience(role);
  const contractorTarget = `${CONTRACTOR_PLAN_ENTRY_ROUTE}${suffix}`;

  if (isAuthenticated && audience === "contractor") {
    return <Navigate to={contractorTarget} replace />;
  }

  const target =
    tab === "entrepreneurs" ? contractorTarget : `${HOMEOWNER_PLANS_ROUTE}${suffix}`;

  return <Navigate to={target} replace />;
}
