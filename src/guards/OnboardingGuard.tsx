/**
 * UNPRO — Onboarding Guard: Forces incomplete users to /onboarding.
 * Non-blocking on profile load: renders children optimistically while
 * profile is still resolving so navigation never freezes.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import RouteSkeleton from "@/components/loaders/RouteSkeleton";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();
  const { data: profile, isLoading: profileLoading, isFetched: profileFetched } = useProfile();

  if (authLoading) return <RouteSkeleton />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === "admin") return <>{children}</>;

  // Only redirect once profile resolved AND incomplete.
  if (profileFetched && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }
  if (profileFetched && !profile && !role) {
    return <Navigate to="/onboarding" replace />;
  }

  // While profile loads, render children — pages handle their own skeletons.
  return <>{children}</>;
}
