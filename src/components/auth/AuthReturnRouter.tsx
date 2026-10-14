/**
 * UNPRO — Auth Return Router
 * Listens for SIGNED_IN events:
 * 1. Upserts profile with auth metadata (non-destructive)
 * 2. Applies any pre-login role choice (sessionStorage `unpro_prelogin_role`)
 * 3. If no role exists at all, sends to /onboarding
 * 4. Redirects to intent or role-based default
 */
import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthIntent, peekAuthIntent, getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import { closeAuthOverlay } from "@/hooks/useAuthOverlay";
import { trackAuthEvent } from "@/services/auth/trackAuthEvent";
import { authDebug } from "@/services/auth/authDebugBus";
import { resolveAuthIntentOnce } from "@/services/auth/authIntentOrchestrator";
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
  // Live pathname (avoids stale closures across awaits).
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  // Auth state known for this tab: "unknown" until INITIAL_SESSION/getSession,
  // "signed_out" when explicitly signed out, otherwise the user id. supabase-js
  // re-emits SIGNED_IN on focus/recovery: unknown or same-user is NEVER treated
  // as a fresh login outside auth surfaces (prevents hijacking e.g. /condos/diagnostic).
  const authStateRef = useRef<string>("unknown");

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || authStateRef.current !== "unknown") return;
      authStateRef.current = data.session?.user?.id ?? "signed_out";
    }).catch(() => { /* stays unknown → fail closed */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let unmounted = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        authStateRef.current = session?.user?.id ?? "signed_out";
        return;
      }
      if (event === "SIGNED_OUT") { authStateRef.current = "signed_out"; return; }
      if (event !== "SIGNED_IN" || !session?.user) return;
      const startPath = pathRef.current;
      const prev = authStateRef.current;
      const isFreshLogin = prev !== "unknown" && prev !== session.user.id;
      authStateRef.current = session.user.id;
      if (!isFreshLogin && !isAuthSurface(startPath)) {
        console.log("[AuthReturnRouter] skip: session re-emission on non-auth page");
        return;
      }
      /** True only if the user is still where the sign-in started. */
      const stillValid = () => !unmounted && pathRef.current === startPath;
      const go = (to: string) => {
        if (!stillValid()) {
          console.log("[AuthReturnRouter] skip redirect: navigation changed or unmounted");
          return false;
        }
        navigate(to, { replace: true });
        return true;
      };

      console.log("[AuthReturnRouter] SIGNED_IN", { user: session.user.id, path: startPath });

      setTimeout(async () => {
      closeAuthOverlay();

      // Profile upsert (fire-and-forget)
      upsertProfile(session.user);

      const provider = session.user.app_metadata?.provider;
      if (provider === "google") trackAuthEvent("google_success");

      const intent = peekAuthIntent();
      const here = pathRef.current;

      // /auth/callback is the canonical orchestrator surface — do not race it.
      if (here === "/auth/callback") return;

      // 1) Resolve current roles
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesErr) {
        console.error("[AuthReturnRouter] user_roles read failed", rolesErr);
      }

      let roleList = (roles ?? []).map((r) => r.role as string);

      // 2) Canonical intent resolution (server cross-device token or local), once.
      const outcome = await resolveAuthIntentOnce({ id: session.user.id, email: session.user.email });
      if (outcome.failed) {
        if (!stillValid()) return;
        // Never fall back to the homeowner dashboard on a failed contractor intent.
        authDebug.error(new Error(outcome.error || "role_activation_failed"), "applying_prelogin_role");
        go("/auth/callback");
        return;
      }
      if (outcome.applied && outcome.role && !roleList.includes(outcome.role)) {
        roleList = [...roleList, outcome.role];
      }
      const intentReturnPath = outcome.returnPath ?? intent?.returnPath ?? null;

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

      if (!stillValid()) return;

      // 5) Honor explicit return path even from non-auth surfaces
      if (intentReturnPath && !/^\/(login|signup|auth\/callback)\b/.test(intentReturnPath)) {
        console.log("[AuthReturnRouter] -> intent path", intentReturnPath);
        if (go(intentReturnPath)) clearAuthIntent();
        return;
      }

      // 5b) Approved partner without intent → partner dashboard
      if (isApprovedPartner) {
        console.log("[AuthReturnRouter] -> /partenaire/dashboard (approved partner)");
        if (go("/partenaire/dashboard")) clearAuthIntent();
        return;
      }

      // 6) Only route automatically from auth-ish surfaces
      if (!isAuthSurface(here)) return;

      // 7) No role at all → onboarding (final safety net)
      if (roleList.length === 0) {
        console.log("[AuthReturnRouter] -> /onboarding (no role)");
        if (go("/onboarding")) clearAuthIntent();
        return;
      }

      const target = postLoginPathForRole(primaryRole, intentReturnPath);
      console.log("[AuthReturnRouter] -> role redirect", { primaryRole, target });
      if (go(target)) clearAuthIntent();
      }, 0);
    });

    return () => { unmounted = true; subscription.unsubscribe(); };
  }, [navigate]);

  return null;
}
