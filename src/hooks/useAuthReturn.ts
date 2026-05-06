/**
 * UNPRO — useAuthReturn
 * Resolves and navigates to the post-login destination.
 * Auto-redirects on confirmed session; exposes manual fallback.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { clearReturnPath, resolveReturnDestination } from "@/lib/authReturn";

interface Options {
  /** Auto-redirect once authenticated. Default true. */
  auto?: boolean;
  /** Delay before redirecting (ms) — lets success animation render. Default 350. */
  delayMs?: number;
}

export function useAuthReturn(opts: Options = {}) {
  const { auto = true, delayMs = 350 } = opts;
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, role, isAdmin } = useAuth() as any;
  const [destination, setDestination] = useState<string>(() =>
    typeof window === "undefined" ? "/dashboard" : resolveReturnDestination({ role: null, isAdmin: false })
  );
  const [redirected, setRedirected] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const fallbackTimer = useRef<number | null>(null);

  const goNow = useCallback(() => {
    const dest = resolveReturnDestination({ role, isAdmin });
    setDestination(dest);
    clearReturnPath();
    setRedirected(true);
    navigate(dest, { replace: true });
  }, [navigate, role, isAdmin]);

  useEffect(() => {
    if (!auto) return;
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (redirected) return;

    const t = window.setTimeout(() => {
      try {
        const dest = resolveReturnDestination({ role, isAdmin });
        setDestination(dest);
        clearReturnPath();
        setRedirected(true);
        navigate(dest, { replace: true });
      } catch (err) {
        console.error("[useAuthReturn] redirect failed", err);
        setShowFallback(true);
      }
    }, delayMs);

    // Safety: if still on /login after 1500ms, expose fallback CTA
    fallbackTimer.current = window.setTimeout(() => {
      if (typeof window !== "undefined" && window.location.pathname === "/login") {
        setShowFallback(true);
      }
    }, 1500);

    return () => {
      window.clearTimeout(t);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    };
  }, [auto, isLoading, isAuthenticated, redirected, role, isAdmin, delayMs, navigate]);

  return { destination, goNow, showFallback, redirected };
}
