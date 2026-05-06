import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { forceClearAuthSession, useAuthSession } from "@/stores/authSessionStore";

const ensuredProfiles = new Set<string>();

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
      if (!data || data.length === 0) return { primary: null as string | null, all: [] as string[] };
      const all = data.map((r) => r.role as string);
      let primary: string;
      if (all.includes("admin")) primary = "admin";
      else if (all.includes("contractor")) primary = "contractor";
      else if (all.includes("partner")) primary = "partner";
      else if (all.includes("condo_manager")) primary = "condo_manager";
      else primary = all[0];
      return { primary, all };
    },
    enabled: !!session?.user?.id,
  });

  const role = roleQuery.data?.primary ?? null;
  const roles = roleQuery.data?.all ?? [];
  const isRoleLoading = !!session?.user?.id && !roleQuery.isFetched && !roleTimedOut;
  const isAuthLoading = loading || isRoleLoading;

  const signOut = useCallback(async () => {
    // Targeted removal — do NOT call queryClient.clear() here.
    // clear() unmounts every observer mid-render and triggers
    // "Should have a queue. This is likely a bug in React."
    queryClient.removeQueries({ queryKey: ["user-role"], exact: false });
    ensuredProfiles.clear();
    forceClearAuthSession();
    await supabase.auth.signOut({ scope: "local" });
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
    roles,
    isAdmin: roles.includes("admin"),
    signOut,
  };
};
