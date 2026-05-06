/**
 * UNPRO — Auth Callback Handler
 * Processes OAuth/magic-link redirects, creates profile if needed, redirects appropriately.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { consumeAuthIntent, getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import { motion } from "framer-motion";
import UnproIcon from "@/components/brand/UnproIcon";
import { authDebug } from "@/services/auth/authDebugBus";

type CallbackState = "processing" | "creating_profile" | "redirecting" | "error";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("processing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Detect provider error in URL early
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errParam = search.get("error") || hash.get("error");
    const errDesc = search.get("error_description") || hash.get("error_description");
    if (errParam) {
      setState("error");
      setError(errDesc || errParam);
      return;
    }

    handleCallback();
    // Hard safety timeout: never leave the user stuck > 5s
    const t = setTimeout(() => {
      setState((curr) => {
        if (curr === "redirecting") return curr;
        console.warn("[AuthCallback] safety timeout reached, falling back to /login");
        navigate("/login", { replace: true });
        return curr;
      });
    }, 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ROLE_MAP: Record<string, string> = {
    homeowner: "homeowner", owner: "homeowner",
    contractor: "contractor", professional: "contractor",
    condo_manager: "condo_manager", property_manager: "condo_manager",
    partner: "homeowner", municipality: "homeowner",
    public_org: "homeowner", enterprise: "homeowner", ambassador: "homeowner",
  };

  function readPreloginRole(): string | null {
    try {
      const raw = sessionStorage.getItem("unpro_prelogin_role");
      if (raw && ROLE_MAP[raw]) return ROLE_MAP[raw];
    } catch { /* noop */ }
    return null;
  }

  async function handleCallback() {
    // Read intent FIRST (before any awaits) so it survives storage races
    // when sessionStorage gets cleared by Supabase auth handshake.
    const intent = consumeAuthIntent();
    const preloginRole = readPreloginRole();

    authDebug.set({
      auth_step: "callback_processing",
      auth_method: "oauth",
      prelogin_role: preloginRole,
      intent_path: intent?.returnPath ?? null,
      last_error: null,
      last_error_step: null,
    });

    try {
      // Wait for auth session to be established
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session?.user) {
        // Try to exchange code if present in URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");
        
        if (code) {
          authDebug.set({ auth_step: "exchange_code" });
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (hashParams.get("access_token")) {
          // Token in hash, session should be set by onAuthStateChange
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw new Error("Aucune session trouvée");
        }
      }

      // Re-check session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user) throw new Error("Session invalide");

      const user = currentSession.user;
      authDebug.set({ auth_step: "session_resolved", provider: user.app_metadata?.provider ?? null });
      authDebug.setSession({ id: user.id, email: user.email });

      // Check if profile exists
      setState("creating_profile");
      authDebug.set({ auth_step: "creating_profile" });
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        // Create profile
        await supabase.from("profiles").insert({
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          first_name: user.user_metadata?.given_name || null,
          last_name: user.user_metadata?.family_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          phone: user.phone || null,
        });
      }

      // Check role
      let { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      let roleList = (roles ?? []).map((r) => r.role as string);
      authDebug.set({ auth_step: "roles_resolved", roles: roleList });

      // Apply pre-login role choice if any (and we don't already have it)
      if (preloginRole && !roleList.includes(preloginRole)) {
        console.log("[AuthCallback] applying prelogin role", preloginRole);
        authDebug.set({ auth_step: "applying_prelogin_role" });
        const { error: roleErr } = await supabase
          .from("user_roles")
          .upsert(
            { user_id: user.id, role: preloginRole as any },
            { onConflict: "user_id,role" }
          );
        if (roleErr) {
          console.error("[AuthCallback] role upsert failed", roleErr);
          authDebug.error(roleErr, "applying_prelogin_role");
        } else {
          roleList = [...roleList, preloginRole];
          authDebug.set({ roles: roleList });
          if (preloginRole === "contractor") {
            try {
              await (supabase.from("contractors") as any).upsert(
                { user_id: user.id, email: user.email || "" },
                { onConflict: "user_id" }
              );
            } catch (e) {
              console.warn("[AuthCallback] contractor stub non-fatal error", e);
            }
          }
        }
        try { sessionStorage.removeItem("unpro_prelogin_role"); } catch { /* noop */ }
      }

      setState("redirecting");

      const hasRole = roleList.length > 0;
      const isAdmin = roleList.includes("admin");
      const onboardingDone = profile?.onboarding_completed;

      // Admin always wins — go straight to intent or /admin, ignore onboarding.
      if (isAdmin) {
        const target =
          intent?.returnPath && !/^\/(login|signup|auth\/callback)\b/.test(intent.returnPath)
            ? intent.returnPath
            : "/admin";
        authDebug.set({ auth_step: "redirecting", redirect_target: target });
        navigate(target, { replace: true });
        return;
      }

      // Honor explicit return path
      if (intent?.returnPath && hasRole && !/^\/(login|signup|auth\/callback)\b/.test(intent.returnPath)) {
        authDebug.set({ auth_step: "redirecting", redirect_target: intent.returnPath });
        navigate(intent.returnPath, { replace: true });
        return;
      }

      if (!hasRole) {
        authDebug.set({ auth_step: "redirecting", redirect_target: "/onboarding" });
        navigate("/onboarding", { replace: true });
        return;
      }

      // Determine primary role (admin already handled above)
      let primaryRole: string | null = null;
      if (roleList.includes("contractor")) primaryRole = "contractor";
      else if (roleList.includes("condo_manager")) primaryRole = "condo_manager";
      else primaryRole = roleList[0];

      // Contractors: jump straight into the voice onboarding flow
      if (primaryRole === "contractor") {
        const target = onboardingDone ? "/pro" : "/join/profile";
        authDebug.set({ auth_step: "redirecting", redirect_target: target });
        navigate(target, { replace: true });
        return;
      }

      if (!onboardingDone) {
        authDebug.set({ auth_step: "redirecting", redirect_target: "/onboarding" });
        navigate("/onboarding", { replace: true });
        return;
      }

      const target = getDefaultRedirectForRole(primaryRole);
      authDebug.set({ auth_step: "redirecting", redirect_target: target });
      navigate(target, { replace: true });

    } catch (err: any) {
      console.error("Auth callback error:", err);
      authDebug.error(err, "callback_processing");
      setState("error");
      setError(err?.message || "Erreur d'authentification");
    }
  }

  const messages: Record<CallbackState, string> = {
    processing: "Vérification en cours…",
    creating_profile: "Préparation de votre compte…",
    redirecting: "Redirection…",
    error: error || "Une erreur est survenue",
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(220 40% 96%) 100%)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <UnproIcon size={64} variant="primary" />
        
        {state !== "error" && (
          <div className="h-1 w-48 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "10%" }}
              animate={{ width: state === "redirecting" ? "100%" : "60%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>
        )}

        <p className={`text-sm ${state === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {messages[state]}
        </p>

        {state === "error" && (
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="text-sm text-primary hover:underline mt-2"
          >
            Retour à la connexion
          </button>
        )}
      </motion.div>
    </div>
  );
}
