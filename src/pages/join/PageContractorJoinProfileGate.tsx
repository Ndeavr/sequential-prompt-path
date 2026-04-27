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

export default function PageContractorJoinProfileGate() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "redirecting" | "error">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const safety = setTimeout(() => {
      if (!alive) return;
      console.warn("[JoinProfileGate] safety timeout — forwarding to /entrepreneur/onboarding-voice");
      navigate("/entrepreneur/onboarding-voice", { replace: true });
    }, 3000);

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
          try { sessionStorage.setItem("unpro_prelogin_role", "contractor"); } catch { /* noop */ }
          authDebug.set({ auth_step: "redirecting", redirect_target: "/login", session_found: false });
          navigate("/login", { replace: true, state: { from: "/join/profile" } });
          return;
        }

        authDebug.setSession({ id: session.user.id, email: session.user.email });

        // Ensure contractor role exists
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        const roleList = (roles ?? []).map((r) => r.role as string);

        if (!roleList.includes("contractor")) {
          await supabase
            .from("user_roles")
            .upsert(
              { user_id: session.user.id, role: "contractor" as any },
              { onConflict: "user_id,role" }
            );
          try {
            await (supabase.from("contractors") as any).upsert(
              { user_id: session.user.id, email: session.user.email || "" },
              { onConflict: "user_id" }
            );
          } catch { /* non-fatal */ }
        }

        const finalRoles = roleList.includes("contractor") ? roleList : [...roleList, "contractor"];
        authDebug.set({ auth_step: "gate_role_ensured", roles: finalRoles });

        if (!alive) return;
        setStatus("redirecting");
        authDebug.set({ auth_step: "redirecting", redirect_target: "/entrepreneur/onboarding-voice" });
        navigate("/entrepreneur/onboarding-voice", { replace: true });
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
      clearTimeout(safety);
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
              <button
                onClick={() => navigate("/entrepreneur/onboarding-voice", { replace: true })}
                className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground"
              >
                Continuer
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
