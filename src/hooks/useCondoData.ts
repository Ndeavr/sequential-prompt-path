/**
 * UNPRO Condos — Core data hooks for assemblies, invoices, budgets, alerts, documents
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ─── Active Syndicate (first one for now, will support multi-syndicate later) ───
export function useActiveSyndicate() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-syndicate", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from("syndicate_members")
        .select("syndicate_id")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .limit(1);
      if (!memberships?.length) return null;
      const { data } = await supabase
        .from("syndicates")
        .select("*")
        .eq("id", memberships[0].syndicate_id)
        .single();
      return data;
    },
  });
}

// ─── Assemblies ───
export function useAssemblies(syndicateId?: string) {
  return useQuery({
    queryKey: ["syndicate-assemblies", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_assemblies" as any)
        .select("*")
        .eq("syndicate_id", syndicateId!)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCreateAssembly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      syndicate_id: string;
      title: string;
      assembly_type?: string;
      scheduled_date: string;
      location?: string;
      quorum_required?: number;
    }) => {
      const { data, error } = await supabase
        .from("syndicate_assemblies" as any)
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["syndicate-assemblies", vars.syndicate_id] }),
  });
}

// ─── Motions ───
export function useMotions(assemblyId?: string) {
  return useQuery({
    queryKey: ["syndicate-motions", assemblyId],
    enabled: !!assemblyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_motions" as any)
        .select("*")
        .eq("assembly_id", assemblyId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCreateMotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      assembly_id: string;
      syndicate_id: string;
      title: string;
      description?: string;
      category?: string;
    }) => {
      const { data, error } = await supabase
        .from("syndicate_motions" as any)
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["syndicate-motions", vars.assembly_id] }),
  });
}

// ─── Vote Records ───
export function useCastVote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { motion_id: string; syndicate_id: string; vote: "yes" | "no" | "abstain" }) => {
      const { data, error } = await supabase
        .from("syndicate_vote_records" as any)
        .insert({ ...values, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["syndicate-motions"] }),
  });
}

// ─── Invoices ───
export function useInvoices(syndicateId?: string) {
  return useQuery({
    queryKey: ["syndicate-invoices", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_invoices" as any)
        .select("*")
        .eq("syndicate_id", syndicateId!)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: {
      syndicate_id: string;
      supplier_name: string;
      description?: string;
      amount_cents: number;
      tax_gst_cents?: number;
      tax_qst_cents?: number;
      invoice_date?: string;
      due_date?: string;
      category?: string;
    }) => {
      const { data, error } = await supabase
        .from("syndicate_invoices" as any)
        .insert({ ...values, created_by: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["syndicate-invoices", vars.syndicate_id] }),
  });
}

// ─── Budgets ───
export function useBudgets(syndicateId?: string) {
  return useQuery({
    queryKey: ["syndicate-budgets", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_budgets" as any)
        .select("*")
        .eq("syndicate_id", syndicateId!)
        .order("fiscal_year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

// ─── Expenses ───
export function useExpenses(syndicateId?: string) {
  return useQuery({
    queryKey: ["syndicate-expenses", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_expenses" as any)
        .select("*")
        .eq("syndicate_id", syndicateId!)
        .order("expense_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

// ─── Alerts ───
export function useAlerts(syndicateId?: string) {
  return useQuery({
    queryKey: ["syndicate-alerts", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_alerts" as any)
        .select("*")
        .eq("syndicate_id", syndicateId!)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, syndicateId }: { id: string; syndicateId: string }) => {
      const { error } = await supabase
        .from("syndicate_alerts" as any)
        .update({ is_dismissed: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["syndicate-alerts"] }),
  });
}

// ─── Documents (from existing syndicate_documents table) ───
export function useCondoDocuments(syndicateId?: string) {
  return useQuery({
    queryKey: ["syndicate-documents-full", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_documents")
        .select("*")
        .eq("syndicate_id", syndicateId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Compliance (from existing condo_compliance_checks) ───
export function useComplianceChecks(condoId?: string) {
  return useQuery({
    queryKey: ["condo-compliance", condoId],
    enabled: !!condoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condo_compliance_checks")
        .select("*")
        .eq("condo_id", condoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Activity Logs ───
export function useActivityLogs(syndicateId?: string) {
  return useQuery({
    queryKey: ["syndicate-activity-logs", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_activity_logs" as any)
        .select("*")
        .eq("syndicate_id", syndicateId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

// ─── Dashboard Summary (aggregate counts for overview) ───
export function useCondoDashboardSummary(syndicateId?: string) {
  return useQuery({
    queryKey: ["condo-dashboard-summary", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const [components, tasks, documents, alerts, invoices, members] = await Promise.all([
        supabase.from("syndicate_components").select("id", { count: "exact", head: true }).eq("syndicate_id", syndicateId!),
        supabase.from("syndicate_maintenance_tasks").select("id, status, priority, due_date").eq("syndicate_id", syndicateId!).order("due_date"),
        supabase.from("syndicate_documents").select("id", { count: "exact", head: true }).eq("syndicate_id", syndicateId!),
        supabase.from("syndicate_alerts" as any).select("*").eq("syndicate_id", syndicateId!).eq("is_dismissed", false).order("created_at", { ascending: false }).limit(5),
        supabase.from("syndicate_invoices" as any).select("*").eq("syndicate_id", syndicateId!).eq("status", "pending").limit(10),
        supabase.from("syndicate_members").select("id", { count: "exact", head: true }).eq("syndicate_id", syndicateId!).eq("is_active", true),
      ]);

      const upcomingTasks = ((tasks.data ?? []) as any[])
        .filter((t: any) => t.status !== "completed" && t.due_date)
        .slice(0, 5);

      return {
        componentCount: components.count ?? 0,
        documentCount: documents.count ?? 0,
        memberCount: members.count ?? 0,
        alerts: (alerts.data ?? []) as any[],
        pendingInvoices: (invoices.data ?? []) as any[],
        upcomingTasks,
      };
    },
  });
}
