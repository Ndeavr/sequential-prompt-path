/**
 * UNPRO — Auth Return Router
 * Listens for SIGNED_IN events and, if the user is currently sitting on an
 * auth-handling surface (/, /login, /signup, /role, /start, /auth/callback),
 * navigates them back to the route they originally came from
 * (consumed from authIntentService). Otherwise, leaves them where they are.
 *
 * This is the single source of truth for post-auth navigation. Page-level
 * `consumeAuthIntent` callbacks remain harmless: they will simply find the
 * intent already consumed.
 */
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { consumeAuthIntent, getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import { closeAuthOverlay } from "@/hooks/useAuthOverlay";

const AUTH_SURFACES = /^\/(login|signup|role|start|auth\/callback)?\/?$/;

function isAuthSurface(pathname: string): boolean {
  if (pathname === "/") return true;
  return AUTH_SURFACES.test(pathname);
}

export default function AuthReturnRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;

      // Always close the overlay if it was open
      closeAuthOverlay();

      const intent = consumeAuthIntent();
      const here = location.pathname;

      // If we have an explicit return path, honor it from any auth surface
      if (intent?.returnPath) {
        // Avoid bouncing back to an auth route by accident
        if (!/^\/(login|signup|auth\/callback)\b/.test(intent.returnPath)) {
          navigate(intent.returnPath, { replace: true });
          return;
        }
      }

      // No intent: only redirect if user is stuck on an auth surface.
      // The dedicated /auth/callback page handles its own role-based fallback.
      if (here === "/auth/callback") return;
      if (!isAuthSurface(here)) return;

      // Resolve role for default redirect
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const roleList = (roles ?? []).map((r) => r.role);
      let primaryRole: string | null = null;
      if (roleList.includes("admin")) primaryRole = "admin";
      else if (roleList.includes("contractor")) primaryRole = "contractor";
      else primaryRole = roleList[0] ?? null;

      navigate(getDefaultRedirectForRole(primaryRole), { replace: true });
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, location.pathname]);

  return null;
}
