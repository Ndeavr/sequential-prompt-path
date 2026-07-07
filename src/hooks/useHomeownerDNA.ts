import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface HomeownerDNAProfile {
  user_id: string;
  communication: Record<string, any>;
  property: Record<string, any>;
  preferences: Record<string, any>;
  environment: Record<string, any>;
  behavior: Record<string, any>;
  confidence: Record<string, number>;
  updated_at: string;
}

export function useHomeownerDNA() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["homeowner-dna", user?.id],
    queryFn: async (): Promise<HomeownerDNAProfile | null> => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any)
        .from("homeowner_compat_dna")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as HomeownerDNAProfile | null;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`dna-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "homeowner_dna_profiles", filter: `user_id=eq.${user.id}` }, () => {
        query.refetch();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return query;
}

/** Fire-and-forget: enqueue extraction after each Alex turn. */
export async function recordMemoryTurn(params: {
  user_id: string;
  session_id?: string | null;
  question: string;
  answer: string;
  source?: string;
}) {
  try {
    await supabase.functions.invoke("alex-memory-extract", { body: params });
  } catch (err) {
    console.warn("[memory] extract failed (non-blocking)", err);
  }
}
