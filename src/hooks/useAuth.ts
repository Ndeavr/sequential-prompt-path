import { useEffect, useState, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleTimedOut, setRoleTimedOut] = useState(false);

  useEffect(() => {
    let resolved = false;
    // Bootstrap: restore persisted session first
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      resolved = true;
      console.log("[useAuth] current auth user", session?.user ? { id: session.user.id, email: session.user.email, phone: session.user.phone } : null);
      if (error) console.error("[useAuth] Supabase session error", error);
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
      console.log("[useAuth] auth state", _event, session?.user ? { id: session.user.id, email: session.user.email, phone: session.user.phone } : null);
      setSession(session);
      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
    });

    return () => {
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, [queryClient]);

  useEffect(() => {
    setRoleTimedOut(false);
    if (!session?.user?.id) return;

    const t = setTimeout(() => {
      console.warn("[useAuth] role/profile loading timeout (8s) — releasing route guard", {
        user: { id: session.user.id, email: session.user.email, phone: session.user.phone },
        redirectTarget: window.location.pathname + window.location.search + window.location.hash,
      });
      setRoleTimedOut(true);
    }, 8000);

    return () => clearTimeout(t);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;

    let cancelled = false;
    const ensureProfile = async () => {
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("id,user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      console.log("[useAuth] profile fetch result", { profile, error: fetchError });
      if (cancelled || profile || fetchError) {
        if (fetchError) console.error("[useAuth] Supabase profile fetch error", fetchError);
        return;
      }

      const { error: insertError } = await supabase.from("profiles").insert({
        user_id: session.user.id,
        email: session.user.email ?? null,
        phone: session.user.phone ?? null,
        full_name: session.user.user_metadata?.full_name ?? null,
      } as any);
      console.log("[useAuth] profile auto-create result", { error: insertError });
      if (insertError) console.error("[useAuth] Supabase profile auto-create error", insertError);
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
    hasResolvedRole: !session?.user || roleQuery.isFetched,
    isAuthenticated: !!session?.user,
    role: role as string | null,
    signOut,
  };
};
