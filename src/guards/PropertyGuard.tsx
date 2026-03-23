/**
 * UNPRO — Property Guard: Ensures homeowner has at least one property
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PropertyGuardProps {
  children: React.ReactNode;
}

export default function PropertyGuard({ children }: PropertyGuardProps) {
  const { user, isLoading: authLoading, role } = useAuth();

  const { data: properties, isLoading } = useQuery({
    queryKey: ["user-properties-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("owner_profile_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id && role === "homeowner",
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  // Non-homeowners pass through
  if (role !== "homeowner") return <>{children}</>;

  if (properties === 0) {
    return <Navigate to="/onboarding?step=property" replace />;
  }

  return <>{children}</>;
}
