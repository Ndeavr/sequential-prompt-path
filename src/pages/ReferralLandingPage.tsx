/**
 * UNPRO — Referral Landing Page (/r/:refCode)
 * Captures attribution and redirects to signup or home.
 */
import { useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { trackReferralEvent } from "@/hooks/useReferralAttribution";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRedirectForRole } from "@/services/auth/authIntentService";

const ReferralLandingPage = () => {
  const { refCode } = useParams<{ refCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, role } = useAuth();

  useEffect(() => {
    if (!refCode) return;

    // Store attribution
    try {
      const attribution = {
        refCode,
        intent: searchParams.get("intent") || undefined,
        utmSource: searchParams.get("utm_source") || undefined,
        capturedAt: new Date().toISOString(),
      };
      localStorage.setItem("unpro_ref", JSON.stringify(attribution));
    } catch {}

    // Track visit
    trackReferralEvent("qr_scan_visit", refCode, {
      targetType: searchParams.get("intent") || "signup",
      metadata: { utm_source: searchParams.get("utm_source") },
    });
  }, [refCode, searchParams]);

  useEffect(() => {
    if (isLoading) return;

    const intent = searchParams.get("intent");

    if (isAuthenticated) {
      // Already logged in — go to dashboard
      if (intent === "book" && role === "homeowner") {
        navigate("/dashboard/appointments", { replace: true });
      } else {
        navigate(getDefaultRedirectForRole(role), { replace: true });
      }
    } else {
      // Redirect to signup with ref preserved
      navigate(`/signup?ref=${refCode}`, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, refCode, role, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Redirection…</p>
      </div>
    </div>
  );
};

export default ReferralLandingPage;
