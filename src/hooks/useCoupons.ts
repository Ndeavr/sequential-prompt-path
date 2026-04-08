import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Coupon {
  id: string;
  code: string;
  label: string | null;
  description: string | null;
  description_public: string | null;
  discount_type: string;
  discount_value: number;
  currency: string;
  duration_type: string;
  duration_in_months: number | null;
  eligible_plan_codes: string[];
  applies_to_billing_intervals: string[];
  is_internal_only: boolean;
  is_partner_only: boolean;
  partner_id: string | null;
  is_founder_offer: boolean;
  is_stackable: boolean;
  usage_limit_total: number | null;
  usage_limit_per_business: number | null;
  current_redemptions_count: number;
  actual_redemptions?: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  stripe_coupon_id: string | null;
  stripe_promotion_code_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon_id?: string;
  code?: string;
  discount_type?: string;
  discount_value?: number;
  duration_type?: string;
  duration_in_months?: number;
  currency?: string;
  is_founder_offer?: boolean;
  label?: string;
  message?: string;
  reason?: string;
}

export interface CouponStats {
  total: number;
  active: number;
  expired: number;
  founder: number;
  total_redemptions: number;
}

export const useValidateCoupon = () => {
  return useMutation({
    mutationFn: async ({
      code, planCode, billingInterval,
    }: {
      code: string;
      planCode: string;
      billingInterval: string;
    }): Promise<CouponValidationResult> => {
      const { data, error } = await supabase.functions.invoke("validate-coupon-code", {
        body: { code, planCode, billingInterval },
      });
      if (error) throw error;
      return data as CouponValidationResult;
    },
  });
};

export const useAdminCoupons = () => {
  return useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-coupons", {
        method: "GET",
        body: undefined,
        headers: {},
      });
      // Edge functions invoked via GET need query params
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-coupons?action=list`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch coupons");
      const result = await res.json();
      return (result.coupons || []) as Coupon[];
    },
  });
};

export const useAdminCouponStats = () => {
  return useQuery({
    queryKey: ["admin-coupon-stats"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-coupons?action=stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch stats");
      return (await res.json()) as CouponStats;
    },
  });
};

export const useCreateCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-coupons?action=create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Creation failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      qc.invalidateQueries({ queryKey: ["admin-coupon-stats"] });
      toast.success("Coupon créé avec succès");
    },
    onError: (err: any) => toast.error(err.message),
  });
};

export const useUpdateCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-coupons?action=update`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon mis à jour");
    },
  });
};

export const useToggleCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-coupons?action=toggle`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }
      );
      if (!res.ok) throw new Error("Toggle failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Statut mis à jour");
    },
  });
};

export const useArchiveCoupon = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-coupons?action=archive`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }
      );
      if (!res.ok) throw new Error("Archive failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      qc.invalidateQueries({ queryKey: ["admin-coupon-stats"] });
      toast.success("Coupon archivé");
    },
  });
};
