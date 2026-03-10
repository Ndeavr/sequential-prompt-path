import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/* ── Dashboard Stats ── */
export const useAdminStats = () =>
  useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [profiles, contractors, properties, quotes, reviews, docs, pendingContractors, quoteAnalyses] =
        await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("contractors").select("id", { count: "exact", head: true }),
          supabase.from("properties").select("id", { count: "exact", head: true }),
          supabase.from("quotes").select("id", { count: "exact", head: true }),
          supabase.from("reviews").select("id", { count: "exact", head: true }),
          supabase.from("storage_documents").select("id", { count: "exact", head: true }),
          supabase.from("contractors").select("id", { count: "exact", head: true }).in("verification_status", ["unverified", "pending"]),
          supabase.from("quote_analysis").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);
      return {
        users: profiles.count ?? 0,
        contractors: contractors.count ?? 0,
        properties: properties.count ?? 0,
        quotes: quotes.count ?? 0,
        reviews: reviews.count ?? 0,
        documents: docs.count ?? 0,
        contractorsNeedingReview: pendingContractors.count ?? 0,
        pendingAnalyses: quoteAnalyses.count ?? 0,
      };
    },
  });

/* ── Recent Activity ── */
export const useAdminRecentActivity = () =>
  useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const [signups, recentContractors, recentDocs, recentQuotes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("contractors").select("id, business_name, city, verification_status, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("storage_documents").select("id, file_name, bucket, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("quotes").select("id, title, amount, status, created_at").order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        signups: signups.data ?? [],
        contractors: recentContractors.data ?? [],
        documents: recentDocs.data ?? [],
        quotes: recentQuotes.data ?? [],
      };
    },
  });

/* ── Users ── */
export const useAdminUsers = () =>
  useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const rolesByUser = (rolesRes.data ?? []).reduce<Record<string, string[]>>((acc, r) => {
        (acc[r.user_id] ??= []).push(r.role);
        return acc;
      }, {});
      return (profilesRes.data ?? []).map((p) => ({ ...p, roles: rolesByUser[p.user_id] ?? [] }));
    },
  });

/* ── Contractors ── */
export const useAdminContractors = () =>
  useQuery({
    queryKey: ["admin-contractors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

export const useAdminContractor = (id: string | undefined) =>
  useQuery({
    queryKey: ["admin-contractor", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contractors").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

export const useAdminContractorDocuments = (userId: string | undefined) =>
  useQuery({
    queryKey: ["admin-contractor-docs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storage_documents")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

export const useUpdateContractorVerification = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      contractorId,
      verification_status,
      admin_note,
    }: {
      contractorId: string;
      verification_status: string;
      admin_note?: string;
    }) => {
      const updates: Record<string, unknown> = {
        verification_status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };
      if (verification_status === "verified") updates.verified_at = new Date().toISOString();
      if (admin_note !== undefined) updates.admin_note = admin_note;

      const { error } = await supabase.from("contractors").update(updates).eq("id", contractorId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-contractors"] });
      qc.invalidateQueries({ queryKey: ["admin-contractor"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
};

/* ── Quotes ── */
export const useAdminQuotes = () =>
  useQuery({
    queryKey: ["admin-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, properties(address, city), quote_analysis(status, fairness_score)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

/* ── Reviews ── */
export const useAdminReviews = () =>
  useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, contractors(business_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

/* ── Documents ── */
export const useAdminDocuments = () =>
  useQuery({
    queryKey: ["admin-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storage_documents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

/* ── Admin Contractor Subscription ── */
export const useAdminContractorSubscription = (contractorId?: string) =>
  useQuery({
    queryKey: ["admin-contractor-subscription", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_subscriptions")
        .select("*")
        .eq("contractor_id", contractorId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!contractorId,
  });
