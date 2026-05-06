import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/stores/authSessionStore";

export const useAuth = () => {
  const queryClient = useQueryClient();
  const { session, loading } = useAuthSession();
  const [roleTimedOut, setRoleTimedOut] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Invalidate role cache when user changes.
  useEffect(() => {
    const uid = session?.user?.id ?? null;
    if (uid !== lastUserIdRef.current) {
      lastUserIdRef.current = uid;
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
    }
  }, [session?.user?.id, queryClient]);

  useEffect(() => {
    setRoleTimedOut(false);
    if (!session?.user?.id) return;
    const t = setTimeout(() => setRoleTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (ensuredProfiles.has(session.user.id)) return;
    ensuredProfiles.add(session.user.id);

    let cancelled = false;
    const ensureProfile = async () => {
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("id,user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled || profile || fetchError) {
        if (fetchError) console.error("[useAuth] profile fetch error", fetchError);
        return;
      }

      const { error: insertError } = await supabase.from("profiles").insert({
        user_id: session.user.id,
        email: session.user.email ?? null,
        phone: session.user.phone ?? null,
        full_name: session.user.user_metadata?.full_name ?? null,
      } as any);
      if (insertError) console.error("[useAuth] profile auto-create error", insertError);
    };

    ensureProfile();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const roleQuery = useQuery({
    queryKey: ["user-role", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      console.log("[useAuth] role fetch result", { roles: data, error });
      if (error) {
        console.error("[useAuth] Supabase role fetch error", error);
        throw error;
      }
      if (!data || data.length === 0) return null;
      const roles = data.map((r) => r.role);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("contractor")) return "contractor";
      return roles[0];
    },
    enabled: !!session?.user?.id,
  });

  const role = roleQuery.data ?? null;
  const isRoleLoading = !!session?.user?.id && !roleQuery.isFetched && !roleTimedOut;
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
    hasResolvedRole: !session?.user || roleQuery.isFetched || roleTimedOut,
    roleError: roleQuery.error ?? null,
    roleTimedOut,
    isAuthenticated: !!session?.user,
    role: role as string | null,
    signOut,
  };
};
