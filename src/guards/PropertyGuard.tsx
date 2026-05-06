/**
 * UNPRO — Property Guard: Ensures homeowner has at least one property
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLoadingTimeout } from "@/hooks/useLoadingTimeout";

interface PropertyGuardProps {
  children: React.ReactNode;
}

export default function PropertyGuard({ children }: PropertyGuardProps) {
  const { user, isLoading: authLoading, role } = useAuth();

  const { data: properties, isLoading } = useQuery({
    queryKey: ["user-properties-count", user?.id],
    queryFn: async () => {
      const { count, error } = await (supabase
        .from("properties") as any)
        .select("id", { count: "exact", head: true })
        .eq("owner_profile_id", user!.id);
      if (error) throw error;
      return (count ?? 0) as number;
    },
    enabled: !!user?.id && role === "homeowner",
  });

  const stillLoading = authLoading || isLoading;
  const timedOut = useLoadingTimeout(stillLoading, 6000, "property_guard");

  if (stillLoading && !timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  // Timed out → let through; better than freezing
  if (timedOut) return <>{children}</>;

  // Non-homeowners pass through
  if (role !== "homeowner") return <>{children}</>;

  if (properties === 0) {
    return <Navigate to="/onboarding?step=property" replace />;
  }

  return <>{children}</>;
}
