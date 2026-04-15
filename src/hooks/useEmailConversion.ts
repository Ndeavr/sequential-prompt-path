import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTrackClick(token: string | undefined) {
  return useQuery({
    queryKey: ["outbound-click", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fn-track-email-click", {
        body: { token, user_agent: navigator.userAgent },
      });
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });
}

export function useAlexContext(token: string | undefined) {
  return useQuery({
    queryKey: ["alex-context", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fn-launch-alex-context", {
        body: { token },
      });
      if (error) throw error;
      return data;
    },
    staleTime: Infinity,
  });
}

export function useCreateBookingSession() {
  return useMutation({
    mutationFn: async (params: { token: string; company_name?: string; city?: string; category?: string; scheduled_at?: string }) => {
      const { data, error } = await supabase.functions.invoke("fn-create-booking-session", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useConvertProspect() {
  return useMutation({
    mutationFn: async (params: { token: string; company_name?: string; city?: string; category?: string; email?: string; phone?: string }) => {
      const { data, error } = await supabase.functions.invoke("fn-convert-prospect-to-lead", {
        body: params,
      });
      if (error) throw error;
      return data;
    },
  });
}
