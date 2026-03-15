/**
 * UNPRO — Contractor Verification Integration Hooks
 * Bridges verification runs ↔ contractor profiles.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/* ── Latest verification snapshot for a contractor ── */
export const useContractorVerificationSnapshot = (contractorId: string | undefined) =>
  useQuery({
    queryKey: ["contractor-verification-snapshot", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_verification_snapshots")
        .select("*")
        .eq("contractor_id", contractorId!)
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!contractorId,
  });

/* ── Verification run history for a contractor ── */
export const useContractorVerificationHistory = (contractorId: string | undefined) =>
  useQuery({
    queryKey: ["contractor-verification-history", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_verification_runs")
        .select("id, created_at, identity_resolution_status, identity_confidence_score, public_trust_score, live_risk_delta, admin_review_status, input_business_name, input_phone")
        .eq("matched_contractor_id", contractorId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractorId,
  });

/* ── Pending merge suggestions for a contractor ── */
export const useContractorMergeSuggestions = (contractorId: string | undefined) =>
  useQuery({
    queryKey: ["contractor-merge-suggestions", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_merge_suggestions")
        .select("*")
        .eq("contractor_id", contractorId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractorId,
  });

/* ── Review a merge suggestion (approve / reject) ── */
export const useReviewMergeSuggestion = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      suggestionId,
      contractorId,
      action,
      note,
    }: {
      suggestionId: string;
      contractorId: string;
      action: "approved" | "rejected";
      note?: string;
    }) => {
      // Update suggestion status
      const { error: sugErr } = await supabase
        .from("contractor_merge_suggestions")
        .update({
          status: action,
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
          review_note: note ?? null,
        })
        .eq("id", suggestionId);
      if (sugErr) throw sugErr;

      // If approved, apply the field update to the contractor
      if (action === "approved") {
        const { data: suggestion } = await supabase
          .from("contractor_merge_suggestions")
          .select("field_name, suggested_value")
          .eq("id", suggestionId)
          .single();
        if (suggestion) {
          const { error: updateErr } = await supabase
            .from("contractors")
            .update({ [suggestion.field_name]: suggestion.suggested_value })
            .eq("id", contractorId);
          if (updateErr) throw updateErr;
        }
      }

      // Log admin action
      await supabase.from("admin_action_logs").insert([{
        actor_user_id: user!.id,
        action_type: `merge_suggestion_${action}`,
        contractor_id: contractorId,
        notes: note ?? null,
        payload_json: { suggestionId } as any,
      }]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor-merge-suggestions"] });
      qc.invalidateQueries({ queryKey: ["admin-contractor"] });
    },
  });
};

/* ── Save a verification snapshot for a contractor ── */
export const useSaveVerificationSnapshot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      contractorId: string;
      verificationRunId: string;
      snapshot: {
        identity_confidence_score: number;
        public_trust_score: number;
        live_risk_delta: number;
        identity_resolution_status: string;
        strengths: string[];
        risks: string[];
        inconsistencies: string[];
        missing_proofs: string[];
        final_recommendation: string;
      };
    }) => {
      // Mark old snapshots as not current
      await supabase
        .from("contractor_verification_snapshots")
        .update({ is_current: false })
        .eq("contractor_id", params.contractorId)
        .eq("is_current", true);

      // Insert new current snapshot
      const { error } = await supabase.from("contractor_verification_snapshots").insert([{
        contractor_id: params.contractorId,
        verification_run_id: params.verificationRunId,
        identity_confidence_score: params.snapshot.identity_confidence_score,
        public_trust_score: params.snapshot.public_trust_score,
        live_risk_delta: params.snapshot.live_risk_delta,
        identity_resolution_status: params.snapshot.identity_resolution_status,
        strengths: params.snapshot.strengths as any,
        risks: params.snapshot.risks as any,
        inconsistencies: params.snapshot.inconsistencies as any,
        missing_proofs: params.snapshot.missing_proofs as any,
        final_recommendation: params.snapshot.final_recommendation,
        is_current: true,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor-verification-snapshot"] });
    },
  });
};
