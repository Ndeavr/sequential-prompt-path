/**
 * UNPRO — Property Passport Hooks
 * React Query bindings for the full Passeport Maison.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Property, PropertyScore, PropertyEvent, PropertyRecommendation, PropertyDocument } from "@/types/property";

export const useProperties = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Property[];
    },
    enabled: !!user?.id,
  });
};

export const useProperty = (id: string | undefined) =>
  useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as unknown as Property;
    },
    enabled: !!id,
  });

export const usePropertyScore = (propertyId: string | undefined) =>
  useQuery({
    queryKey: ["property-score", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_scores")
        .select("*")
        .eq("property_id", propertyId!)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as PropertyScore | null;
    },
    enabled: !!propertyId,
  });

export const usePropertyRecommendations = (propertyId: string | undefined) =>
  useQuery({
    queryKey: ["property-recommendations", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_recommendations")
        .select("*")
        .eq("property_id", propertyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PropertyRecommendation[];
    },
    enabled: !!propertyId,
  });

export const usePropertyEvents = (propertyId: string | undefined) =>
  useQuery({
    queryKey: ["property-events", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_events")
        .select("*")
        .eq("property_id", propertyId!)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data as unknown as PropertyEvent[];
    },
    enabled: !!propertyId,
  });

export const usePropertyDocuments = (propertyId: string | undefined) =>
  useQuery({
    queryKey: ["property-documents", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_documents")
        .select("*")
        .eq("property_id", propertyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PropertyDocument[];
    },
    enabled: !!propertyId,
  });

export const useCreateProperty = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (property: {
      address: string;
      city?: string;
      province?: string;
      postal_code?: string;
      country?: string;
      property_type?: string;
      year_built?: number;
      square_footage?: number;
      lot_size?: number;
    }) => {
      const { data, error } = await supabase
        .from("properties")
        .insert({ ...property, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
};

export const useUpdateProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [k: string]: unknown }) => {
      const { data, error } = await supabase.from("properties").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
};

export const useUploadPropertyDocument = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ propertyId, file, documentType, title }: {
      propertyId: string;
      file: File;
      documentType: string;
      title: string;
    }) => {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user!.id}/${propertyId}/${crypto.randomUUID()}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from("property-documents")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from("property_documents").insert({
        property_id: propertyId,
        user_id: user!.id,
        title,
        document_type: documentType,
        storage_path: path,
        file_size: file.size,
      });
      if (dbError) throw dbError;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["property-documents", vars.propertyId] }),
  });
};

export const useDeletePropertyDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, propertyId, storagePath }: {
      id: string;
      propertyId: string;
      storagePath: string | null;
    }) => {
      if (storagePath) {
        await supabase.storage.from("property-documents").remove([storagePath]);
      }
      const { error } = await supabase.from("property_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["property-documents", vars.propertyId] }),
  });
};

export const useCreatePropertyEvent = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (event: {
      property_id: string;
      event_type: string;
      title: string;
      description?: string;
      event_date?: string;
      cost?: number;
    }) => {
      const { data, error } = await supabase
        .from("property_events")
        .insert({ ...event, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["property-events", vars.property_id] }),
  });
};
