/**
 * UNPRO — Route Transition Loader
 * Premium loading screen shown during route resolution.
 * Hard 8s timeout falls back to a recovery screen instead of infinite loading.
 */
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function RouteTransitionLoader() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.warn("[RouteTransitionLoader] 8s timeout — entering recovery", {
          user: user ? { id: user.id, email: user.email } : null,
          error,
          path: window.location.pathname,
        });

        // Auto-create profile if missing
        if (user) {
          const { data: profile, error: pErr } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          console.log("[RouteTransitionLoader] profile fetch", { profile, error: pErr });
          if (!profile && !pErr) {
            const { error: insErr } = await supabase
              .from("profiles")
              .insert({ user_id: user.id, full_name: user.user_metadata?.full_name || "" } as any);
            console.log("[RouteTransitionLoader] profile auto-created", { error: insErr });
          }
        }
      } catch (e) {
        console.error("[RouteTransitionLoader] recovery diagnostic error", e);
      }
      setStuck(true);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  if (stuck) {
    const goHome = () => { window.location.href = "/"; };
    const retry = () => { window.location.reload(); };
    const debug = () => { window.location.href = "/admin/sms-debug"; };

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <h1 className="text-xl font-semibold text-foreground">Chargement interrompu</h1>
          <p className="text-sm text-muted-foreground">
            Votre session est peut-être active, mais l'espace n'a pas chargé correctement.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={retry}
              className="px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Réessayer
            </button>
            <button
              onClick={goHome}
              className="px-4 py-3 rounded-lg bg-muted text-foreground text-sm font-medium hover:opacity-90"
            >
              Aller à l'accueil
            </button>
            <button
              onClick={debug}
              className="px-4 py-3 rounded-lg border border-border text-muted-foreground text-xs hover:bg-muted/50"
            >
              Ouvrir /admin/sms-debug
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          className="h-12 w-12 rounded-full bg-primary/20"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.3)" }}
        />
        <p className="text-sm text-muted-foreground animate-pulse">
          Préparation de votre espace UNPRO…
        </p>
      </motion.div>
    </div>
  );
}
