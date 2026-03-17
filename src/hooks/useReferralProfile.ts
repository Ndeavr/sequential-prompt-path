/**
 * UNPRO — Referral Profile Hook
 * Fetches current user's referral code, role, and stats.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ShareRole = "homeowner" | "contractor" | "affiliate" | "admin";

export interface ReferralProfile {
  referralCode: string;
  role: ShareRole;
  contractorSlug?: string;
  fullName?: string;
}

export interface ReferralStats {
  totalViews: number;
  totalSignups: number;
  totalClicks: number;
}

export const useReferralProfile = () => {
  const { user, role } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["referral-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: p } = await supabase
        .from("profiles")
        .select("referral_code, full_name, affiliate_code")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!p?.referral_code) return null;

      let contractorSlug: string | undefined;
      if (role === "contractor") {
        const { data: c } = await supabase
          .from("contractors")
          .select("slug")
          .eq("user_id", user.id)
          .maybeSingle();
        contractorSlug = c?.slug || undefined;
      }

      return {
        referralCode: p.referral_code,
        role: (role || "homeowner") as ShareRole,
        contractorSlug,
        fullName: p.full_name || undefined,
      } as ReferralProfile;
    },
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ["referral-stats", user?.id],
    queryFn: async () => {
      if (!user?.id || !profile?.referralCode) return { totalViews: 0, totalSignups: 0, totalClicks: 0 };

      const code = profile.referralCode;

      const [viewsRes, signupsRes, clicksRes] = await Promise.all([
        supabase.from("referral_events" as any).select("id", { count: "exact", head: true }).eq("referral_code", code).eq("event_type", "qr_scan_visit"),
        supabase.from("affiliate_attributions" as any).select("id", { count: "exact", head: true }).eq("referral_code", code).eq("conversion_type", "signup"),
        supabase.from("referral_events" as any).select("id", { count: "exact", head: true }).eq("referral_code", code).eq("event_type", "link_copy"),
      ]);

      return {
        totalViews: viewsRes.count || 0,
        totalSignups: signupsRes.count || 0,
        totalClicks: clicksRes.count || 0,
      } as ReferralStats;
    },
    enabled: !!user?.id && !!profile?.referralCode,
  });

  return { profile, stats, isLoading };
};
