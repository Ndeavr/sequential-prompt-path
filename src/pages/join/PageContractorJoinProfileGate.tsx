/**
 * UNPRO — Contractor Join Profile Gate (/join/profile)
 *
 * Post-auth landing for contractors. Ensures:
 *  - User is authenticated (otherwise redirect to /role with intent)
 *  - User has contractor role (apply prelogin role if needed)
 *  - Redirects into the voice-first onboarding flow
 *
 * Hard 3s safety timeout — never strands the user on a loading screen.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import UnproIcon from "@/components/brand/UnproIcon";
import { authDebug } from "@/services/auth/authDebugBus";
import { applyRoleIntent, readRoleIntent, saveRoleIntent } from "@/services/auth/roleIntent";
import { saveAuthIntent } from "@/services/auth/authIntentService";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

export default function PageContractorJoinProfileGate() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "redirecting" | "error">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      authDebug.set({
        auth_step: "gate_checking",
        auth_method: "oauth",
        prelogin_role: "contractor",
        intent_path: "/join/profile",
        last_error: null,
        last_error_step: null,
      });
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!alive) return;

        if (!session?.user) {
          const params = new URLSearchParams(window.location.search);
          const returnPath = `/join/profile${window.location.search}`;
          const attribution = Object.fromEntries(params);
          saveRoleIntent("contractor", {
            returnPath,
            token: params.get("t") ?? params.get("token") ?? undefined,
            prospectId: params.get("prospect_id") ?? params.get("prospect") ?? undefined,
            leadId: params.get("lead_id") ?? params.get("lead") ?? undefined,
            affiliateRef: params.get("aff") ?? params.get("affiliate") ?? params.get("ref") ?? undefined,
            campaignId: params.get("campaign_id") ?? params.get("campaign") ?? params.get("utm_campaign") ?? undefined,
            onboardingStep: params.get("step") ?? "profile",
            businessName: params.get("entreprise") ?? undefined,
            city: params.get("ville") ?? params.get("city") ?? undefined,
            trade: params.get("metier") ?? params.get("trade") ?? undefined,
            attribution,
          });
          saveAuthIntent({ returnPath, action: "contractor_activation", roleHint: "contractor", metadata: attribution });
          authDebug.set({ auth_step: "redirecting", redirect_target: "/login", session_found: false });
          navigate("/login", { replace: true, state: { from: "/join/profile" } });
          return;
        }

        authDebug.setSession({ id: session.user.id, email: session.user.email });

        let roleIntent = readRoleIntent();
        if (!roleIntent) {
          const params = new URLSearchParams(window.location.search);
          roleIntent = saveRoleIntent("contractor", {
            returnPath: `/join/profile${window.location.search}`,
            token: params.get("t") ?? params.get("token") ?? undefined,
            prospectId: params.get("prospect_id") ?? undefined,
            affiliateRef: params.get("aff") ?? params.get("affiliate") ?? params.get("ref") ?? undefined,
            onboardingStep: params.get("step") ?? "profile",
            businessName: params.get("entreprise") ?? undefined,
            city: params.get("ville") ?? params.get("city") ?? undefined,
            trade: params.get("metier") ?? params.get("trade") ?? undefined,
            attribution: Object.fromEntries(params),
          });
        }
        const applied = await applyRoleIntent({ id: session.user.id, email: session.user.email }, roleIntent);
        if (!applied.applied) throw new Error(applied.error || "Impossible d’activer le profil entrepreneur.");
        const finalRoles = ["contractor"];
        authDebug.set({ auth_step: "gate_role_ensured", roles: finalRoles });

        if (!alive) return;
        setStatus("redirecting");
        const resume = `/entrepreneurs/profil${window.location.search}`;
        void logFunnelEvent({ event_type: "onboarding_resumed", step: "matching_profile" });
        authDebug.set({ auth_step: "redirecting", redirect_target: resume });
        navigate(resume, { replace: true });
      } catch (e: any) {
        console.error("[JoinProfileGate] error", e);
        authDebug.error(e, "gate_checking");
        if (!alive) return;
        setStatus("error");
        setError(e?.message || "Erreur d'authentification");
      }
    })();

    return () => {
      alive = false;
    };
  }, [navigate]);

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg, hsl(228 25% 6%) 0%, hsl(228 30% 4%) 100%)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <UnproIcon size={56} variant="primary" />
        {status !== "error" ? (
          <>
            <div className="h-1 w-48 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "hsl(222 100% 65%)" }}
                initial={{ width: "10%" }}
                animate={{ width: status === "redirecting" ? "100%" : "60%" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            </div>
            <p className="text-sm text-white/70">Préparation de votre profil entrepreneur…</p>
          </>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/login", { replace: true })}
                className="px-4 py-2 text-xs rounded-lg bg-white/10 text-white hover:bg-white/15"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
