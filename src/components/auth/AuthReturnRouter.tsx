/**
 * UNPRO — Auth Return Router
 * Listens for SIGNED_IN events:
 * 1. Upserts profile with auth metadata (non-destructive)
 * 2. If no role exists, shows role picker overlay
 * 3. Redirects to intent or role-based default
 */
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { consumeAuthIntent, getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import { closeAuthOverlay } from "@/hooks/useAuthOverlay";
import { trackAuthEvent } from "@/services/auth/trackAuthEvent";

const AUTH_SURFACES = /^\/(login|signup|role|start|auth\/callback)?\/?$/;

function isAuthSurface(pathname: string): boolean {
  if (pathname === "/") return true;
  return AUTH_SURFACES.test(pathname);
}

async function upsertProfile(user: { id: string; email?: string; phone?: string; user_metadata?: Record<string, any> }) {
  const meta = user.user_metadata ?? {};

  // Determine auth provider
  const provider = meta.iss?.includes("google") ? "google"
    : user.phone ? "phone"
    : user.email ? "email"
    : "unknown";

  const profileData: Record<string, unknown> = {
    user_id: user.id,
    last_login_at: new Date().toISOString(),
    auth_provider: provider,
  };

  if (user.email) profileData.email = user.email;
  if (user.phone) profileData.phone = user.phone;
  if (meta.given_name || meta.full_name) {
    const firstName = meta.given_name || (meta.full_name as string)?.split(" ")[0];
    if (firstName) profileData.first_name = firstName;
  }
  if (meta.family_name || meta.full_name) {
    const lastName = meta.family_name || (meta.full_name as string)?.split(" ").slice(1).join(" ");
    if (lastName) profileData.last_name = lastName;
  }

  try {
    await supabase.from("profiles").upsert(
      profileData as any,
      { onConflict: "user_id", ignoreDuplicates: false }
    );
  } catch {
    // Non-critical
  }
}

export default function AuthReturnRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;

      closeAuthOverlay();

      // Profile upsert (fire-and-forget)
      upsertProfile(session.user);

      // Track success
      const provider = session.user.app_metadata?.provider;
      if (provider === "google") trackAuthEvent("google_success");

      const intent = consumeAuthIntent();
      const here = location.pathname;

      // If we have an explicit return path, honor it
      if (intent?.returnPath) {
        if (!/^\/(login|signup|auth\/callback)\b/.test(intent.returnPath)) {
          navigate(intent.returnPath, { replace: true });
          return;
        }
      }

      // /auth/callback handles its own routing
      if (here === "/auth/callback") return;
      if (!isAuthSurface(here)) return;

      // Resolve role for default redirect
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const roleList = (roles ?? []).map((r) => r.role);

      // If no roles at all, navigate to /role for selection
      if (roleList.length === 0) {
        navigate("/role", { replace: true });
        return;
      }

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
