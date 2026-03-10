import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useContractorProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contractor-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contractors").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useUpsertContractorProfile = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (profile: { business_name: string; specialty?: string; description?: string; phone?: string; email?: string; website?: string; address?: string; city?: string; province?: string; postal_code?: string; license_number?: string; insurance_info?: string; years_experience?: number }) => {
      const { data: existing } = await supabase.from("contractors").select("id").eq("user_id", user!.id).maybeSingle();
      if (existing) {
        const { data, error } = await supabase.from("contractors").update(profile).eq("user_id", user!.id).select().single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.from("contractors").insert({ ...profile, user_id: user!.id }).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-profile"] }),
  });
};

export const useContractorReviews = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contractor-reviews", user?.id],
    queryFn: async () => {
      const { data: contractor } = await supabase.from("contractors").select("id").eq("user_id", user!.id).maybeSingle();
      if (!contractor) return [];
      const { data, error } = await supabase.from("reviews").select("*").eq("contractor_id", contractor.id).eq("is_published", true).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useContractorAIPPScore = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contractor-aipp", user?.id],
    queryFn: async () => {
      const { data: contractor } = await supabase.from("contractors").select("id").eq("user_id", user!.id).maybeSingle();
      if (!contractor) return [];
      const { data, error } = await supabase.from("aipp_scores").select("*").eq("entity_type", "contractor").eq("entity_id", contractor.id).order("calculated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useContractorDocuments = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contractor-documents", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("storage_documents").select("*").eq("user_id", user!.id).eq("bucket", "contractor-documents").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useUploadContractorDocument = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const path = `${user!.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("contractor-documents").upload(path, file);
      if (uploadError) throw uploadError;
      const { data, error } = await supabase.from("storage_documents").insert({
        user_id: user!.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        bucket: "contractor-documents",
        storage_path: path,
        entity_type: "contractor",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-documents"] }),
  });
};
