/**
 * UNPRO — Contractor Join Profile Gate (/join/profile)
 *
 * Post-auth landing for contractors. Ensures:
 *  - User is authenticated (otherwise redirect to /role with intent)
 *  - User has contractor role (apply prelogin role if needed)
 *  - Runs the ONE canonical atomic free activation (no Stripe, no checkout)
 *  - Resumes the canonical matching-profile step with its full query context
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import UnproIcon from "@/components/brand/UnproIcon";
import { authDebug } from "@/services/auth/authDebugBus";
import { applyRoleIntent, readRoleIntent, saveRoleIntent } from "@/services/auth/roleIntent";
import { saveAuthIntent } from "@/services/auth/authIntentService";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import {
  buildFreeActivationContext,
  freeActivationMessage,
  runFreeServiceActivation,
  type FreeActivationResult,
} from "@/lib/activation/freeServiceActivation";

type Status = "checking" | "activating" | "active" | "redirecting" | "error";

export default function PageContractorJoinProfileGate() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [founderEnd, setFounderEnd] = useState<string | null>(null);
  /** Garde d'idempotence côté écran : double montage / double clic. */
  const startedRef = useRef(false);

  const resumePath = `/entrepreneurs/profil${window.location.search}`;

  const resume = useCallback(() => {
    void logFunnelEvent({ event_type: "onboarding_resumed", step: "matching_profile" });
    authDebug.set({ auth_step: "redirecting", redirect_target: resumePath });
    navigate(resumePath, { replace: true });
  }, [navigate, resumePath]);

  const run = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    authDebug.set({
      auth_step: "gate_checking",
      auth_method: "oauth",
      prelogin_role: "contractor",
      intent_path: "/join/profile",
      last_error: null,
      last_error_step: null,
    });
    setStatus("checking");
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

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
      void logFunnelEvent({ event_type: "auth_completed", step: "free_service_activation" });

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
      if (!applied.applied) throw new Error(applied.error || "Impossible d'activer le profil entrepreneur.");
      authDebug.set({ auth_step: "gate_role_ensured", roles: ["contractor"] });

      // ── Activation gratuite atomique : une seule transaction, zéro Stripe ──
      setStatus("activating");
      const context = buildFreeActivationContext(window.location.search, roleIntent);
      const result: FreeActivationResult = await runFreeServiceActivation(context);

      if (result.kind === "activated") {
        setFounderEnd(result.founderEnd);
        setStatus("active");
        return;
      }

      if (result.kind === "not_eligible") {
        // État normal : pas d'année gratuite, mais le parcours continue.
        setNotice(freeActivationMessage(result));
        setStatus("redirecting");
        resume();
        return;
      }

      // Échec réel : aucune conversion comptée, reprise possible.
      startedRef.current = false;
      setStatus("error");
      setError(freeActivationMessage(result));
    } catch (e: unknown) {
      console.error("[JoinProfileGate] error", e);
      authDebug.error(e, "gate_checking");
      startedRef.current = false;
      setStatus("error");
      setError(e instanceof Error ? e.message : "Erreur d'authentification");
    }
  }, [navigate, resume]);

  useEffect(() => {
    void run();
  }, [run]);

  const founderEndLabel = founderEnd
    ? new Date(founderEnd).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg, hsl(228 25% 6%) 0%, hsl(228 30% 4%) 100%)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex w-full max-w-sm flex-col items-center gap-4 text-center"
      >
        <UnproIcon size={56} variant="primary" />

        {status === "active" ? (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold text-white">Votre profil UNPRO est actif</h1>
            {founderEndLabel && (
              <p className="text-sm text-white/70">
                Année gratuite confirmée jusqu'au {founderEndLabel}.
              </p>
            )}
            <p className="text-sm text-white/60">
              Il reste trois réponses : vos services, votre territoire et vos disponibilités.
            </p>
            <button
              onClick={resume}
              className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-[#060B14]"
              style={{ background: "hsl(42 96% 60%)" }}
            >
              Continuer
            </button>
          </div>
        ) : status === "error" ? (
          <div className="space-y-3">
            <p className="text-sm text-red-400">{error}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => void run()}
                className="rounded-lg bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/15"
              >
                Réessayer
              </button>
              <button
                onClick={() => navigate("/login", { replace: true })}
                className="rounded-lg bg-white/5 px-4 py-2 text-xs text-white/80 hover:bg-white/10"
              >
                Me reconnecter
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "hsl(222 100% 65%)" }}
                initial={{ width: "10%" }}
                animate={{ width: status === "redirecting" ? "100%" : status === "activating" ? "80%" : "60%" }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            </div>
            <p className="text-sm text-white/70">
              {status === "activating" ? "Activation de votre profil…" : "Préparation de votre profil entrepreneur…"}
            </p>
            {notice && <p className="text-xs text-white/50">{notice}</p>}
          </>
        )}
      </motion.div>
    </div>
  );
}
