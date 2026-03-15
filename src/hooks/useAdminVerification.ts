/**
 * UNPRO — Admin Verification Hooks
 * Queries & mutations for the verification console.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/* ── Verification Runs List ── */
export interface VerificationRunFilter {
  status?: string;
  search?: string;
  hasEvidence?: boolean;
  unreadAlerts?: boolean;
  scoreDrop?: boolean;
}

export const useAdminVerificationRuns = (filters?: VerificationRunFilter) =>
  useQuery({
    queryKey: ["admin-verification-runs", filters],
    queryFn: async () => {
      let q = supabase
        .from("contractor_verification_runs")
        .select("*, contractors(business_name, admin_verified, internal_verified_score, city, phone, rbq_number)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filters?.status === "pending") q = q.eq("admin_review_status", "pending");
      if (filters?.status === "ambiguous") q = q.eq("identity_resolution_status", "ambiguous_match");
      if (filters?.status === "no_match") q = q.eq("identity_resolution_status", "no_reliable_match");
      if (filters?.status === "verified_internal") q = q.eq("identity_resolution_status", "verified_internal_profile");
      if (filters?.scoreDrop) q = q.lt("live_risk_delta", -10);

      if (filters?.search) {
        const s = `%${filters.search}%`;
        q = q.or(`input_business_name.ilike.${s},input_phone.ilike.${s},input_rbq.ilike.${s},input_neq.ilike.${s},input_city.ilike.${s}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

/* ── Single Verification Run ── */
export const useAdminVerificationRun = (id: string | undefined) =>
  useQuery({
    queryKey: ["admin-verification-run", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_verification_runs")
        .select("*, contractors(id, business_name, legal_name, phone, website, city, rbq_number, neq, admin_verified, internal_verified_score, internal_verified_at, verification_status, verification_notes)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

/* ── Evidence for a run ── */
export const useAdminVerificationEvidence = (runId: string | undefined) =>
  useQuery({
    queryKey: ["admin-verification-evidence", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_verification_evidence")
        .select("*")
        .eq("verification_run_id", runId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!runId,
  });

/* ── Admin Notifications ── */
export const useAdminNotifications = (unreadOnly?: boolean) =>
  useQuery({
    queryKey: ["admin-notifications", unreadOnly],
    queryFn: async () => {
      let q = supabase
        .from("admin_notifications")
        .select("*, contractors(business_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (unreadOnly) q = q.eq("is_read", false);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

/* ── Mark notification read ── */
export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });
};

/* ── Verified contractors list ── */
export const useAdminVerifiedContractors = () =>
  useQuery({
    queryKey: ["admin-verified-contractors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select("id, business_name, admin_verified, internal_verified_score, internal_verified_at, verification_status, city, rbq_number, phone, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

/* ── Admin action logger ── */
export const useLogAdminAction = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: {
      actionType: string;
      contractorId?: string | null;
      verificationRunId?: string | null;
      notes?: string;
      payload?: Record<string, unknown>;
    }) => {
      const row = {
        actor_user_id: user!.id,
        action_type: params.actionType,
        contractor_id: params.contractorId ?? null,
        verification_run_id: params.verificationRunId ?? null,
        notes: params.notes ?? null,
        payload_json: (params.payload ?? {}) as any,
      };
      const { error } = await supabase.from("admin_action_logs").insert([row]);
      if (error) throw error;
    },
  });
};

/* ── Update verification run review status ── */
export const useUpdateRunReviewStatus = () => {
  const qc = useQueryClient();
  const logAction = useLogAdminAction();
  return useMutation({
    mutationFn: async ({ runId, status, notes }: { runId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from("contractor_verification_runs")
        .update({ admin_review_status: status })
        .eq("id", runId);
      if (error) throw error;
      await logAction.mutateAsync({
        actionType: `review_status_${status}`,
        verificationRunId: runId,
        notes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-verification-runs"] });
      qc.invalidateQueries({ queryKey: ["admin-verification-run"] });
    },
  });
};

/* ── Update contractor admin verification ── */
export const useAdminVerifyContractor = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const logAction = useLogAdminAction();
  return useMutation({
    mutationFn: async ({
      contractorId,
      adminVerified,
      internalVerifiedScore,
      verificationNotes,
    }: {
      contractorId: string;
      adminVerified: boolean;
      internalVerifiedScore?: number;
      verificationNotes?: string;
    }) => {
      const updates: Record<string, unknown> = {
        admin_verified: adminVerified,
        verification_status: adminVerified ? "verified" : "pending",
        internal_verified_at: adminVerified ? new Date().toISOString() : null,
        internal_verified_by: adminVerified ? user!.id : null,
      };
      if (internalVerifiedScore !== undefined) updates.internal_verified_score = internalVerifiedScore;
      if (verificationNotes !== undefined) updates.verification_notes = verificationNotes;

      const { error } = await supabase.from("contractors").update(updates).eq("id", contractorId);
      if (error) throw error;

      await logAction.mutateAsync({
        actionType: adminVerified ? "admin_verify_contractor" : "admin_unverify_contractor",
        contractorId,
        notes: verificationNotes,
        payload: { internalVerifiedScore },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-verified-contractors"] });
      qc.invalidateQueries({ queryKey: ["admin-verification-run"] });
      qc.invalidateQueries({ queryKey: ["admin-contractor"] });
    },
  });
};
