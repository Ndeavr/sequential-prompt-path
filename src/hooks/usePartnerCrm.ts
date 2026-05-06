/**
 * UNPRO — Partner CRM hooks
 * Reads/writes partner_leads, activities, tasks, consent.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePartner } from "@/pages/partner/usePartner";

export const usePartnerLeads = (filters?: { status?: string }) => {
  const { partner } = usePartner();
  return useQuery({
    queryKey: ["partner-leads", partner?.id, filters],
    queryFn: async () => {
      let q = supabase.from("partner_leads" as any).select("*").eq("partner_id", partner!.id);
      if (filters?.status) q = q.eq("lead_status", filters.status);
      const { data, error } = await q.order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!partner?.id,
  });
};

export const usePartnerLead = (id?: string) => {
  return useQuery({
    queryKey: ["partner-lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_leads" as any).select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
};

export const useLeadActivities = (leadId?: string) =>
  useQuery({
    queryKey: ["partner-lead-activities", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_lead_activities" as any)
        .select("*").eq("lead_id", leadId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!leadId,
  });

export const usePartnerTasks = (window: "today" | "late" | "week" | "all" = "all") => {
  const { partner } = usePartner();
  return useQuery({
    queryKey: ["partner-tasks", partner?.id, window],
    queryFn: async () => {
      let q = supabase.from("partner_tasks" as any).select("*, partner_leads(business_name, contact_name)")
        .eq("partner_id", partner!.id).eq("status", "open");
      const now = new Date();
      if (window === "today") {
        const start = new Date(now); start.setHours(0,0,0,0);
        const end = new Date(now); end.setHours(23,59,59,999);
        q = q.gte("due_at", start.toISOString()).lte("due_at", end.toISOString());
      } else if (window === "late") {
        q = q.lt("due_at", now.toISOString());
      } else if (window === "week") {
        const end = new Date(now); end.setDate(end.getDate() + 7);
        q = q.gte("due_at", now.toISOString()).lte("due_at", end.toISOString());
      }
      const { data, error } = await q.order("due_at", { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!partner?.id,
  });
};

export const useCreateLead = () => {
  const qc = useQueryClient();
  const { partner } = usePartner();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("partner_leads" as any)
        .insert({ ...payload, partner_id: partner!.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-leads"] }),
  });
};

export const useUpdateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { data, error } = await supabase
        .from("partner_leads" as any).update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["partner-leads"] });
      qc.invalidateQueries({ queryKey: ["partner-lead", v.id] });
    },
  });
};

export const useLogActivity = () => {
  const qc = useQueryClient();
  const { partner } = usePartner();
  return useMutation({
    mutationFn: async (payload: { lead_id: string; activity_type: string; subject?: string; body?: string; outcome?: string; direction?: string }) => {
      const { data, error } = await supabase
        .from("partner_lead_activities" as any)
        .insert({ ...payload, partner_id: partner!.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["partner-lead-activities", v.lead_id] }),
  });
};

export const useCreateTask = () => {
  const qc = useQueryClient();
  const { partner } = usePartner();
  return useMutation({
    mutationFn: async (payload: { lead_id?: string; title: string; due_at?: string; priority?: string; task_type?: string; description?: string }) => {
      const { data, error } = await supabase
        .from("partner_tasks" as any)
        .insert({ ...payload, partner_id: partner!.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-tasks"] }),
  });
};

export const useCompleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("partner_tasks" as any)
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-tasks"] }),
  });
};

export const useRecordConsent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { lead_id: string; new_status: string; consent_method?: string; consent_proof?: string }) => {
      const patch: any = {
        consent_status: input.new_status,
        consent_method: input.consent_method ?? null,
        consent_proof: input.consent_proof ?? null,
      };
      if (["verbal_permission","written_permission","web_form_opt_in","existing_business_relationship"].includes(input.new_status)) {
        patch.consent_given_at = new Date().toISOString();
        patch.opt_out_at = null;
        if (input.new_status !== "permission_required") patch.lead_status = "contact_authorized";
      }
      if (["opted_out","do_not_contact"].includes(input.new_status)) {
        patch.opt_out_at = new Date().toISOString();
        patch.lead_status = "do_not_contact";
      }
      const { data, error } = await supabase
        .from("partner_leads" as any).update(patch).eq("id", input.lead_id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["partner-leads"] });
      qc.invalidateQueries({ queryKey: ["partner-lead", v.lead_id] });
    },
  });
};
