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
import { consumeAuthIntent, getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import { closeAuthOverlay } from "@/hooks/useAuthOverlay";
import { trackAuthEvent } from "@/services/auth/trackAuthEvent";

const AUTH_SURFACES = /^\/(login|signup|role|start|auth\/callback)?\/?$/;

function isAuthSurface(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/index") return true;
  return AUTH_SURFACES.test(pathname);
}

const VALID_PRELOGIN_ROLES = new Set([
  "homeowner",
  "contractor",
  "condo_manager",
  "professional",
  "partner",
  "municipality",
  "public_org",
  "enterprise",
  "ambassador",
]);

function readPreloginRole(): string | null {
  try {
    const raw = sessionStorage.getItem("unpro_prelogin_role");
    if (raw && VALID_PRELOGIN_ROLES.has(raw)) return raw;
  } catch { /* noop */ }
  return null;
}

function clearPreloginRole() {
  try { sessionStorage.removeItem("unpro_prelogin_role"); } catch { /* noop */ }
}

async function upsertProfile(user: { id: string; email?: string; phone?: string; user_metadata?: Record<string, any> }) {
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
      profileData as any,
      { onConflict: "user_id", ignoreDuplicates: false }
    );
  } catch {
    // Non-critical
  }
}

/**
 * Apply a pre-login role selection to user_roles, and create dependent stubs.
 * Maps marketing-friendly keys onto the canonical app_role enum.
 * Returns the canonical role applied (or null on failure).
 */
async function applyPreloginRole(user: { id: string; email?: string }, preloginRole: string): Promise<string | null> {
  // Map fuzzy labels to canonical app_role values used in user_roles.role
  const ROLE_MAP: Record<string, string> = {
    homeowner: "homeowner",
    owner: "homeowner",
    contractor: "contractor",
    professional: "contractor",
    condo_manager: "condo_manager",
    property_manager: "condo_manager",
    partner: "homeowner",
    municipality: "homeowner",
    public_org: "homeowner",
    enterprise: "homeowner",
    ambassador: "homeowner",
  };
  const canonical = ROLE_MAP[preloginRole] ?? preloginRole;

  try {
    const { error } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: user.id, role: canonical as any },
        { onConflict: "user_id,role" }
      );
    if (error) {
      console.error("[AuthReturnRouter] role upsert failed", error);
      return null;
    }

    // For contractors, ensure a contractor row exists so the onboarding flow has data
    if (canonical === "contractor") {
      try {
        await (supabase.from("contractors") as any).upsert(
          {
            user_id: user.id,
            email: user.email || "",
          },
          { onConflict: "user_id" }
        );
      } catch (e) {
        console.warn("[AuthReturnRouter] contractor stub upsert non-fatal error", e);
      }
    }

    return canonical;
  } catch (e) {
    console.error("[AuthReturnRouter] applyPreloginRole exception", e);
    return null;
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;

      console.log("[AuthReturnRouter] SIGNED_IN", { user: session.user.id, path: location.pathname });
      closeAuthOverlay();

      // Profile upsert (fire-and-forget)
      upsertProfile(session.user);

      const provider = session.user.app_metadata?.provider;
      if (provider === "google") trackAuthEvent("google_success");

      const intent = consumeAuthIntent();
      const here = location.pathname;
      const preloginRole = readPreloginRole();

      // 1) Resolve current roles
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesErr) {
        console.error("[AuthReturnRouter] user_roles read failed", rolesErr);
      }

      let roleList = (roles ?? []).map((r) => r.role as string);

      // 2) If user pre-selected a role and doesn't have it yet, apply it now
      if (preloginRole) {
        const applied = await applyPreloginRole(session.user, preloginRole);
        clearPreloginRole();
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

      // 4) /auth/callback handles its own routing
      if (here === "/auth/callback") return;

      // 5) Honor explicit return path even from non-auth surfaces
      if (intent?.returnPath && !/^\/(login|signup|auth\/callback)\b/.test(intent.returnPath)) {
        console.log("[AuthReturnRouter] -> intent path", intent.returnPath);
        navigate(intent.returnPath, { replace: true });
        return;
      }

      // 6) Only route automatically from auth-ish surfaces
      if (!isAuthSurface(here)) return;

      // 7) No role at all → onboarding (final safety net)
      if (roleList.length === 0) {
        console.log("[AuthReturnRouter] -> /onboarding (no role)");
        navigate("/onboarding", { replace: true });
        return;
      }

      const target = postLoginPathForRole(primaryRole, intent?.returnPath ?? null);
      console.log("[AuthReturnRouter] -> role redirect", { primaryRole, target });
      navigate(target, { replace: true });
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, location.pathname]);

  return null;
}
