/**
 * UNPRO — Partner Guard
 * Requires authenticated user with role 'partner' (or admin), AND approved partner row.
 * On unauthenticated access, redirects to /partenaire/login with returnTo.
 */
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { saveReturnPath } from "@/lib/authReturn";

export default function PartnerGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, role, isAdmin, user } = useAuth();
  const loc = useLocation();
  const [partnerStatus, setPartnerStatus] = useState<"loading" | "approved" | "pending" | "none">("loading");

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user?.id) { setPartnerStatus("none"); return; }
      const { data } = await supabase
        .from("partners" as any)
        .select("partner_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancel) return;
      const s = (data as any)?.partner_status;
      if (s === "approved") setPartnerStatus("approved");
      else if (s) setPartnerStatus("pending");
      else setPartnerStatus("none");
    })();
    return () => { cancel = true; };
  }, [user?.id]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#060B14] text-white/60">Chargement…</div>;

  if (!isAuthenticated) {
    const path = loc.pathname + loc.search;
    saveReturnPath(path, "protected_route");
    return <Navigate to={`/partenaire/login?returnTo=${encodeURIComponent(path)}`} replace />;
  }

  if (isAdmin) return <>{children}</>;

  if (role !== "partner" && partnerStatus !== "approved") {
    if (partnerStatus === "loading") return <div className="min-h-screen flex items-center justify-center bg-[#060B14] text-white/60">Vérification…</div>;
    if (partnerStatus === "pending") {
      return (
        <div className="min-h-screen bg-[#060B14] text-white flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-3">
            <h1 className="text-2xl font-semibold">Approbation en cours</h1>
            <p className="text-white/60">Votre demande de Partenaire Certifié est en attente d'approbation par un administrateur.</p>
          </div>
        </div>
      );
    }
    return <Navigate to="/partenaires-certifies" replace />;
  }

  return <>{children}</>;
}
