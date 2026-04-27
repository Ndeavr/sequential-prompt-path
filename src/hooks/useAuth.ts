import { useEffect, useState, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let resolved = false;
    // Bootstrap: restore persisted session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolved = true;
      setSession(session);
      setLoading(false);
    });

    // Safety timeout: never let loading hang past 5s. If we still don't have
    // a session resolved, force loading=false so the UI can show the public/
    // unauthenticated state instead of an infinite "Chargement…" spinner.
    const safety = setTimeout(() => {
      if (!resolved) {
        console.warn("[useAuth] session resolution timeout (5s) — releasing loading state");
        setLoading(false);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolved = true;
      setSession(session);
      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
    });

    return () => {
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const roleQuery = useQuery({
    queryKey: ["user-role", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const roles = data.map((r) => r.role);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("contractor")) return "contractor";
      return roles[0];
    },
    enabled: !!session?.user?.id,
  });

  const role = roleQuery.data ?? null;
  const isRoleLoading = !!session?.user?.id && !roleQuery.isFetched;
  const isAuthLoading = loading || isRoleLoading;

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  return {
    user: session?.user ?? null,
    session,
    isLoading: isAuthLoading,
    isRoleLoading,
    hasResolvedRole: !session?.user || roleQuery.isFetched,
    isAuthenticated: !!session?.user,
    role: role as string | null,
    signOut,
  };
};
