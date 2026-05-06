/**
 * UNPRO — Partner Guard
 * Requires authenticated user, accepted terms, AND approved application.
 * Optionally enforces a feature permission.
 */
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { saveReturnPath } from "@/lib/authReturn";
import { partnerCan, type PartnerFeature } from "@/lib/partnerPermissions";

interface PartnerRow {
  id: string;
  partner_status: string;
  partner_application_status: string;
  partner_type: string;
}

export default function PartnerGuard({
  children,
  feature,
}: {
  children: React.ReactNode;
  feature?: PartnerFeature;
}) {
  const { isAuthenticated, isLoading, isAdmin, user } = useAuth();
  const loc = useLocation();
  const [state, setState] = useState<"loading" | "ok" | "pending" | "rejected" | "suspended" | "none" | "forbidden">("loading");
  const [partner, setPartner] = useState<PartnerRow | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user?.id) { setState("none"); return; }
      const { data } = await supabase
        .from("partners" as any)
        .select("id, partner_status, partner_application_status, partner_type")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancel) return;
      const p = data as any as PartnerRow | null;
      setPartner(p);
      if (!p) { setState("none"); return; }
      const s = p.partner_application_status;
      if (s === "approved" && p.partner_status !== "suspended") {
        if (feature && !partnerCan(p.partner_type, feature)) { setState("forbidden"); return; }
        setState("ok");
      } else if (s === "rejected") setState("rejected");
      else if (s === "suspended" || p.partner_status === "suspended") setState("suspended");
      else setState("pending");
    })();
    return () => { cancel = true; };
  }, [user?.id, feature]);

  if (isLoading || state === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-[#060B14] text-white/60">Chargement…</div>;
  }

  if (!isAuthenticated) {
    const path = loc.pathname + loc.search;
    saveReturnPath(path, "protected_route");
    return <Navigate to={`/partenaire/login?returnTo=${encodeURIComponent(path)}`} replace />;
  }

  if (isAdmin) return <>{children}</>;

  if (state === "none") return <Navigate to="/partenaire/devenir-partenaire" replace />;
  if (state === "pending" || state === "rejected" || state === "suspended") {
    return <Navigate to="/partenaire/en-attente" replace />;
  }
  if (state === "forbidden") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060B14] text-white p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold">Accès non inclus</h1>
          <p className="text-white/60">Cette fonctionnalité n'est pas incluse dans votre niveau partenaire actuel ({partner?.partner_type}).</p>
          <a href="/partenaire/dashboard" className="inline-block mt-2 text-amber-400 hover:underline">Retour au tableau de bord</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
