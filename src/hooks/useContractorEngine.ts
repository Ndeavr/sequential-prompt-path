/**
 * UNPRO — useContractorEngine
 * Hooks for contractor capabilities, exclusions, execution model, relationships, teams.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useContractorProfile } from "./useContractor";

// ─── Get contractor ID helper ───
const useContractorId = () => {
  const { data: profile } = useContractorProfile();
  return profile?.id as string | undefined;
};

// ─── Capabilities ───
export const useContractorCapabilities = () => {
  const contractorId = useContractorId();
  return useQuery({
    queryKey: ["contractor-capabilities", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_capabilities")
        .select("*")
        .eq("contractor_id", contractorId!)
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractorId,
  });
};

export const useUpsertCapability = () => {
  const qc = useQueryClient();
  const contractorId = useContractorId();
  return useMutation({
    mutationFn: async (cap: { capability_type: string; category_slug?: string; service_slug?: string; material_slug?: string; structure_type?: string; building_type?: string }) => {
      const { data, error } = await supabase
        .from("contractor_capabilities")
        .insert({ ...cap, contractor_id: contractorId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-capabilities"] }),
  });
};

export const useDeleteCapability = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contractor_capabilities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-capabilities"] }),
  });
};

// ─── Exclusions ───
export const useContractorExclusions = () => {
  const contractorId = useContractorId();
  return useQuery({
    queryKey: ["contractor-exclusions", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_exclusions")
        .select("*")
        .eq("contractor_id", contractorId!)
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractorId,
  });
};

export const useAddExclusion = () => {
  const qc = useQueryClient();
  const contractorId = useContractorId();
  return useMutation({
    mutationFn: async (excl: { exclusion_type: string; category_slug?: string; service_slug?: string; material_slug?: string; structure_type?: string; building_type?: string; reason_fr?: string }) => {
      const { data, error } = await supabase
        .from("contractor_exclusions")
        .insert({ ...excl, contractor_id: contractorId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-exclusions"] }),
  });
};

export const useDeleteExclusion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contractor_exclusions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contractor-exclusions"] }),
  });
};

// ─── Execution Model ───
export const useExecutionModel = () => {
  const contractorId = useContractorId();
  return useQuery({
    queryKey: ["execution-model", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_execution_models")
        .select("*")
        .eq("contractor_id", contractorId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!contractorId,
  });
};

export const useUpsertExecutionModel = () => {
  const qc = useQueryClient();
  const contractorId = useContractorId();
  return useMutation({
    mutationFn: async (model: { execution_mode?: string; works_as_subcontractor?: boolean; accepts_subcontractors?: boolean; preferred_project_sizes?: string[]; max_distance_km?: number; availability_status?: string }) => {
      const { data: existing } = await supabase
        .from("contractor_execution_models")
        .select("id")
        .eq("contractor_id", contractorId!)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("contractor_execution_models")
          .update({ ...model, updated_at: new Date().toISOString() })
          .eq("contractor_id", contractorId!)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("contractor_execution_models")
          .insert({ ...model, contractor_id: contractorId! })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["execution-model"] }),
  });
};

// ─── Partner Network ───
export const usePartnerNetwork = () => {
  const contractorId = useContractorId();
  return useQuery({
    queryKey: ["partner-network", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_relationships")
        .select(`
          *,
          partner:contractors!contractor_relationships_partner_contractor_id_fkey (
            business_name, specialty, city, logo_url, rating
          )
        `)
        .eq("contractor_id", contractorId!)
        .order("collaboration_count", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractorId,
  });
};

export const useAddPartner = () => {
  const qc = useQueryClient();
  const contractorId = useContractorId();
  return useMutation({
    mutationFn: async (payload: { partner_contractor_id: string; relationship_type?: string }) => {
      const { data, error } = await supabase
        .from("contractor_relationships")
        .insert({ contractor_id: contractorId!, ...payload })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-network"] }),
  });
};

export const useUpdateRelationship = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; is_favorite?: boolean; is_blocked?: boolean; internal_rating?: number; private_notes?: string }) => {
      const { data, error } = await supabase
        .from("contractor_relationships")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-network"] }),
  });
};

// ─── Project Teams ───
export const useProjectTeams = () => {
  const contractorId = useContractorId();
  return useQuery({
    queryKey: ["project-teams", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_teams")
        .select(`
          *,
          members:project_team_members (
            *,
            contractor:contractors!project_team_members_contractor_id_fkey (
              business_name, specialty, city, logo_url
            )
          )
        `)
        .eq("lead_contractor_id", contractorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractorId,
  });
};

export const useCreateTeam = () => {
  const qc = useQueryClient();
  const contractorId = useContractorId();
  return useMutation({
    mutationFn: async (payload: { team_name?: string; appointment_id?: string }) => {
      const { data, error } = await supabase
        .from("project_teams")
        .insert({ lead_contractor_id: contractorId!, ...payload })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-teams"] }),
  });
};

export const useAddTeamMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { team_id: string; contractor_id: string; role_label: string; scope_slugs?: string[] }) => {
      const { data, error } = await supabase
        .from("project_team_members")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-teams"] }),
  });
};

// ─── Smart Decline ───
export const useSmartDecline = () => {
  const qc = useQueryClient();
  const contractorId = useContractorId();
  return useMutation({
    mutationFn: async (payload: { appointment_id: string; decline_type: string; reason_code?: string; reason_text?: string; redirect_contractor_id?: string }) => {
      // Log the decline
      const { error: logError } = await supabase
        .from("smart_decline_logs")
        .insert({ contractor_id: contractorId!, ...payload });
      if (logError) throw logError;

      // Update appointment status
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "declined" as any })
        .eq("id", payload.appointment_id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor-leads"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
};

// ─── Subcontract Requests ───
export const useSubcontractRequests = () => {
  const contractorId = useContractorId();
  return useQuery({
    queryKey: ["subcontract-requests", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcontract_requests")
        .select(`
          *,
          matched_contractor:contractors!subcontract_requests_matched_contractor_id_fkey (
            business_name, specialty, city
          )
        `)
        .eq("requesting_contractor_id", contractorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractorId,
  });
};

export const useCreateSubcontractRequest = () => {
  const qc = useQueryClient();
  const contractorId = useContractorId();
  return useMutation({
    mutationFn: async (payload: { scope_description: string; scope_slugs?: string[]; material_slugs?: string[]; structure_type?: string; city_slug?: string; appointment_id?: string }) => {
      const { data, error } = await supabase
        .from("subcontract_requests")
        .insert({ requesting_contractor_id: contractorId!, ...payload })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subcontract-requests"] }),
  });
};
