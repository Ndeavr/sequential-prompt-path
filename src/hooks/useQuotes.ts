import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useQuotes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quotes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*, properties(address, city)").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useCreateQuote = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (quote: { title: string; description?: string; amount?: number; property_id: string; file_url?: string }) => {
      const { data, error } = await supabase.from("quotes").insert({ ...quote, user_id: user!.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
};

export const useUploadQuoteFile = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (file: File) => {
      const path = `${user!.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("quote-files").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("quote-files").getPublicUrl(path);
      return publicUrl;
    },
  });
};
