/**
 * UNPRO — useAuthReturn
 * Resolves and navigates to the post-login destination.
 * Triggers as soon as a Supabase session exists — does NOT wait for role query
 * (role can lag and would otherwise block the redirect indefinitely).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "@/stores/authSessionStore";
import { useAuth } from "@/hooks/useAuth";
import { clearReturnPath, resolveReturnDestination } from "@/lib/authReturn";

interface Options {
  /** Auto-redirect once authenticated. Default true. */
  auto?: boolean;
  /** Delay before redirecting (ms) — lets success animation render. Default 350, max 500. */
  delayMs?: number;
}

export function useAuthReturn(opts: Options = {}) {
  const { auto = true, delayMs = 350 } = opts;
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useAuthSession();
  const { role, isAdmin } = useAuth() as any;

  const isAuthenticated = !!session?.user;

  const [destination, setDestination] = useState<string>(() =>
    typeof window === "undefined" ? "/dashboard" : resolveReturnDestination({ role: null, isAdmin: false })
  );
  const [redirected, setRedirected] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const fallbackTimer = useRef<number | null>(null);
  const didNavigateRef = useRef(false);

  const goNow = useCallback(() => {
    if (didNavigateRef.current) return;
    const dest = resolveReturnDestination({ role, isAdmin });
    setDestination(dest);
    didNavigateRef.current = true;
    setRedirected(true);
    try {
      navigate(dest, { replace: true });
      // Clear ONLY after successful navigation
      setTimeout(() => clearReturnPath(), 50);
    } catch (err) {
      console.error("[useAuthReturn] manual navigate failed", err);
      setShowFallback(true);
    }
  }, [navigate, role, isAdmin]);

  useEffect(() => {
    if (!auto) return;
    if (sessionLoading) return;
    if (!isAuthenticated) return;
    if (didNavigateRef.current) return;

    const safeDelay = Math.min(Math.max(delayMs, 0), 500);

    const t = window.setTimeout(() => {
      if (didNavigateRef.current) return;
      try {
        const dest = resolveReturnDestination({ role, isAdmin });
        setDestination(dest);
        didNavigateRef.current = true;
        setRedirected(true);
        navigate(dest, { replace: true });
        setTimeout(() => clearReturnPath(), 50);
      } catch (err) {
        console.error("[useAuthReturn] redirect failed", err);
        setShowFallback(true);
      }
    }, safeDelay);

    // Safety: if still on /login after 1500ms, expose fallback CTA
    fallbackTimer.current = window.setTimeout(() => {
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/login")) {
        setShowFallback(true);
      }
    }, 1500);

    return () => {
      window.clearTimeout(t);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    };
  }, [auto, sessionLoading, isAuthenticated, role, isAdmin, delayMs, navigate]);

  return { destination, goNow, showFallback, redirected };
}
