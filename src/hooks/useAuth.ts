import { useEffect, useState, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const { data: role } = useQuery({
    queryKey: ["user-role", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      // Priority: admin > contractor > homeowner
      const roles = data.map((r) => r.role);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("contractor")) return "contractor";
      return roles[0];
    },
    enabled: !!session?.user?.id,
  });

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    userRole: string,
    meta?: { salutation?: string; first_name?: string; last_name?: string; account_type?: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: userRole,
          ...meta,
        },
      },
    });
    return { data, error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  return {
    user: session?.user ?? null,
    session,
    isLoading: loading,
    isAuthenticated: !!session?.user,
    role: role as string | null,
    signUp,
    signIn,
    signOut,
  };
};
