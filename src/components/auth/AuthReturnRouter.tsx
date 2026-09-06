/**
 * UNPRO — Auth Return Router
 * Listens for SIGNED_IN events:
 * 1. Upserts profile with auth metadata (non-destructive)
 * 2. Applies any pre-login role choice (sessionStorage `unpro_prelogin_role`)
 * 3. If no role exists at all, sends to /onboarding
 * 4. Redirects to intent or role-based default
 */
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthIntent, peekAuthIntent, getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import { closeAuthOverlay } from "@/hooks/useAuthOverlay";
import { trackAuthEvent } from "@/services/auth/trackAuthEvent";
import { authDebug } from "@/services/auth/authDebugBus";
import { applyRoleIntent, readRoleIntent } from "@/services/auth/roleIntent";
import type { User } from "@supabase/supabase-js";

const AUTH_SURFACES = /^\/(login|signup|role|start|auth\/callback)\/?$/;

function isAuthSurface(pathname: string): boolean {
  // Home ("/" and "/index") is a real destination — never auto-redirect from it.
  return AUTH_SURFACES.test(pathname);
}

async function upsertProfile(user: Pick<User, "id" | "email" | "phone" | "user_metadata">) {
  const meta = user.user_metadata ?? {};

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
      profileData as never,
      { onConflict: "user_id", ignoreDuplicates: false }
    );
  } catch {
    // Non-critical
  }
}

function postLoginPathForRole(role: string | null, intentPath?: string | null): string {
  if (intentPath && !/^\/(login|signup|auth\/callback|role)\b/.test(intentPath)) {
    return intentPath;
  }
  switch (role) {
    case "admin":
      return "/admin";
    case "contractor":
      // Send fresh contractors through the join profile gate which guarantees
      // role + contractor row exist, then forwards to onboarding.
      return "/join/profile";
    case "homeowner":
      return "/dashboard";
    case "condo_manager":
      return "/condo";
    default:
      return getDefaultRedirectForRole(role);
  }
}

export default function AuthReturnRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;

      console.log("[AuthReturnRouter] SIGNED_IN", { user: session.user.id, path: location.pathname });

      setTimeout(async () => {
      closeAuthOverlay();

      // Profile upsert (fire-and-forget)
      upsertProfile(session.user);

      const provider = session.user.app_metadata?.provider;
      if (provider === "google") trackAuthEvent("google_success");

      const intent = peekAuthIntent();
      const here = location.pathname;
      const roleIntent = readRoleIntent();

      // 1) Resolve current roles
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesErr) {
        console.error("[AuthReturnRouter] user_roles read failed", rolesErr);
      }

      let roleList = (roles ?? []).map((r) => r.role as string);

      // 2) If user pre-selected a role, apply it now (idempotent)
      if (roleIntent) {
        const { role: applied, applied: succeeded, error } = await applyRoleIntent(
          { id: session.user.id, email: session.user.email },
          roleIntent,
        );
        if (!succeeded) {
          authDebug.error(new Error(error || "role_activation_failed"), "applying_prelogin_role");
          return;
        }
        if (applied && !roleList.includes(applied)) {
          roleList = [...roleList, applied];
        }
      }

      // 3) Pick primary role
      let primaryRole: string | null = null;
      if (roleList.includes("admin")) primaryRole = "admin";
      else if (roleList.includes("contractor")) primaryRole = "contractor";
      else if (roleList.includes("condo_manager")) primaryRole = "condo_manager";
      else primaryRole = roleList[0] ?? null;

      // 3b) Partner safety net — approved partner row routes straight to dashboard
      let isApprovedPartner = false;
      try {
        const { data: pr } = await supabase
          .from("partners")
          .select("partner_status, partner_application_status")
          .eq("user_id", session.user.id)
          .maybeSingle();
        const p = pr as { partner_status?: string; partner_application_status?: string } | null;
        isApprovedPartner = !!p && p.partner_application_status === "approved" && p.partner_status !== "suspended";
      } catch { /* noop */ }

      // 4) /auth/callback handles its own routing
      if (here === "/auth/callback") return;

      // 5) Honor explicit return path even from non-auth surfaces
      if (intent?.returnPath && !/^\/(login|signup|auth\/callback)\b/.test(intent.returnPath)) {
        console.log("[AuthReturnRouter] -> intent path", intent.returnPath);
        navigate(intent.returnPath, { replace: true });
        clearAuthIntent();
        return;
      }

      // 5b) Approved partner without intent → partner dashboard
      if (isApprovedPartner) {
        console.log("[AuthReturnRouter] -> /partenaire/dashboard (approved partner)");
        navigate("/partenaire/dashboard", { replace: true });
        clearAuthIntent();
        return;
      }

      // 6) Only route automatically from auth-ish surfaces
      if (!isAuthSurface(here)) return;

      // 7) No role at all → onboarding (final safety net)
      if (roleList.length === 0) {
        console.log("[AuthReturnRouter] -> /onboarding (no role)");
        navigate("/onboarding", { replace: true });
        clearAuthIntent();
        return;
      }

      const target = postLoginPathForRole(primaryRole, intent?.returnPath ?? null);
      console.log("[AuthReturnRouter] -> role redirect", { primaryRole, target });
      navigate(target, { replace: true });
      clearAuthIntent();
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return null;
}
