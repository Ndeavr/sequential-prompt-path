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

type CallbackState = "processing" | "creating_profile" | "redirecting" | "error";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>("processing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
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

      // Check if profile exists
      setState("creating_profile");
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
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      setState("redirecting");

      const intent = consumeAuthIntent();
      const hasRole = roles && roles.length > 0;
      const onboardingDone = profile?.onboarding_completed;

      if (!hasRole) {
        navigate("/onboarding", { replace: true });
        return;
      }

      if (!onboardingDone) {
        navigate("/onboarding", { replace: true });
        return;
      }

      // Determine role for redirect
      const roleList = roles!.map(r => r.role);
      let primaryRole: string | null = null;
      if (roleList.includes("admin")) primaryRole = "admin";
      else if (roleList.includes("contractor")) primaryRole = "contractor";
      else primaryRole = roleList[0];

      const target = intent?.returnPath || getDefaultRedirectForRole(primaryRole);
      navigate(target, { replace: true });

    } catch (err: any) {
      console.error("Auth callback error:", err);
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
