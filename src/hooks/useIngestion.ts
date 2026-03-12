/**
 * UNPRO — useIngestion Hook
 * Manages document ingestion jobs and tracks processing status.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useIngestionJobs = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ingestion-jobs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingestion_jobs")
        .select("*, ingestion_job_items(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useIngestionJob = (jobId?: string) => {
  return useQuery({
    queryKey: ["ingestion-job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingestion_jobs")
        .select("*, ingestion_job_items(*)")
        .eq("id", jobId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "processing" || status === "pending" ? 3000 : false;
    },
  });
};

export const useCreateIngestionJob = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      docType,
      propertyId,
    }: {
      files: Array<{ path: string; name: string; size: number }>;
      docType: string;
      propertyId?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Create job
      const { data: job, error: jobError } = await supabase
        .from("ingestion_jobs")
        .insert({
          user_id: user.id,
          status: "pending" as any,
          job_type: "document_analysis",
          total_items: files.length,
          metadata: { property_id: propertyId, doc_type: docType },
        })
        .select("id")
        .single();
      if (jobError) throw jobError;

      // Create job items
      const items = files.map(f => ({
        job_id: job.id,
        doc_type: docType as any,
        status: "pending" as any,
        storage_path: f.path,
        file_name: f.name,
        file_size: f.size,
      }));

      const { error: itemsError } = await supabase
        .from("ingestion_job_items")
        .insert(items);
      if (itemsError) throw itemsError;

      // Trigger async processing via edge function
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      for (const item of items) {
        // Fire and forget — edge function processes asynchronously
        supabase.functions.invoke("extract-document-entities", {
          body: {
            job_item_id: job.id,
            content: "", // Content would be read from storage in production
            doc_type: docType,
          },
        }).catch(console.error);
      }

      return job;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingestion-jobs"] });
    },
  });
};

export const useDocumentEntities = (jobItemId?: string) => {
  return useQuery({
    queryKey: ["document-entities", jobItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_entities")
        .select("*")
        .eq("job_item_id", jobItemId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!jobItemId,
  });
};

export const useDocumentChunks = (jobItemId?: string) => {
  return useQuery({
    queryKey: ["document-chunks", jobItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_chunks")
        .select("*")
        .eq("job_item_id", jobItemId!)
        .order("chunk_index", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!jobItemId,
  });
};

export const usePropertyExtractions = (propertyId?: string) => {
  return useQuery({
    queryKey: ["property-extractions", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_ai_extractions")
        .select("*")
        .eq("property_id", propertyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });
};

export const usePropertyMasterRecord = (propertyId?: string) => {
  return useQuery({
    queryKey: ["property-master-record", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_master_records")
        .select("*")
        .eq("property_id", propertyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });
};

export const useTriggerPropertyScore = () => {
  return useMutation({
    mutationFn: async ({ propertyId, userId }: { propertyId: string; userId?: string }) => {
      const { data, error } = await supabase.functions.invoke("compute-property-score", {
        body: { property_id: propertyId, user_id: userId },
      });
      if (error) throw error;
      return data;
    },
  });
};

export const useTriggerContractorScore = () => {
  return useMutation({
    mutationFn: async ({ contractorId }: { contractorId: string }) => {
      const { data, error } = await supabase.functions.invoke("compute-contractor-score", {
        body: { contractor_id: contractorId },
      });
      if (error) throw error;
      return data;
    },
  });
};
