import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useSyndicates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["syndicates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get syndicate IDs the user belongs to
      const { data: memberships, error: mErr } = await supabase
        .from("syndicate_members")
        .select("syndicate_id")
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if (mErr) throw mErr;
      if (!memberships?.length) return [];

      const ids = memberships.map((m: any) => m.syndicate_id);
      const { data, error } = await supabase
        .from("syndicates")
        .select("*")
        .in("id", ids)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSyndicate(id: string | undefined) {
  return useQuery({
    queryKey: ["syndicate", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicates")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSyndicateMembers(syndicateId: string | undefined) {
  return useQuery({
    queryKey: ["syndicate-members", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_members")
        .select("*, profiles(full_name, email)")
        .eq("syndicate_id", syndicateId!)
        .eq("is_active", true)
        .order("role");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReserveFundSnapshots(syndicateId: string | undefined) {
  return useQuery({
    queryKey: ["reserve-fund", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_reserve_fund_snapshots")
        .select("*")
        .eq("syndicate_id", syndicateId!)
        .order("snapshot_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMaintenancePlans(syndicateId: string | undefined) {
  return useQuery({
    queryKey: ["maintenance-plans", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_maintenance_plans")
        .select("*, syndicate_maintenance_items(*)")
        .eq("syndicate_id", syndicateId!)
        .order("plan_year", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCapexForecasts(syndicateId: string | undefined) {
  return useQuery({
    queryKey: ["capex-forecasts", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_capex_forecasts")
        .select("*")
        .eq("syndicate_id", syndicateId!)
        .order("forecast_year");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSyndicateVotes(syndicateId: string | undefined) {
  return useQuery({
    queryKey: ["syndicate-votes", syndicateId],
    enabled: !!syndicateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_votes")
        .select("*, syndicate_vote_choices(*)")
        .eq("syndicate_id", syndicateId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVoteResponses(voteId: string | undefined) {
  return useQuery({
    queryKey: ["vote-responses", voteId],
    enabled: !!voteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("syndicate_vote_responses")
        .select("*, syndicate_vote_choices(label)")
        .eq("vote_id", voteId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateSyndicate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { name: string; address?: string; city?: string; unit_count?: number; description?: string }) => {
      const { data, error } = await supabase
        .from("syndicates")
        .insert({ ...values, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      // Auto-add creator as administrator
      await supabase.from("syndicate_members").insert({
        syndicate_id: data.id,
        user_id: user!.id,
        role: "administrator",
        share_percentage: 0,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["syndicates"] }),
  });
}

export function useCreateVote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: {
      syndicate_id: string;
      title: string;
      description?: string;
      vote_type?: string;
      quorum_percentage?: number;
      required_majority?: number;
      choices: string[];
      opens_at?: string;
      closes_at?: string;
    }) => {
      const { choices, ...voteData } = values;
      const { data: vote, error } = await supabase
        .from("syndicate_votes")
        .insert({ ...voteData, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;

      // Insert choices
      const choiceInserts = choices.map((label, i) => ({
        vote_id: vote.id,
        label,
        display_order: i,
      }));
      const { error: cErr } = await supabase.from("syndicate_vote_choices").insert(choiceInserts);
      if (cErr) throw cErr;

      return vote;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["syndicate-votes", vars.syndicate_id] }),
  });
}

export function useSubmitVote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { vote_id: string; choice_id: string; member_id: string; weight?: number }) => {
      const { data, error } = await supabase
        .from("syndicate_vote_responses")
        .insert({ ...values, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["vote-responses", vars.vote_id] }),
  });
}
