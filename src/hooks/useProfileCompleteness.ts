import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ProfileCompleteness {
  has_name: boolean;
  has_phone: boolean;
  has_email: boolean;
  has_address: boolean;
  has_city: boolean;
  has_postal_code: boolean;
  completion_score: number;
  is_complete: boolean;
  missing_fields: string[];
}

const FIELD_LABELS: Record<string, string> = {
  first_name: "Prénom",
  phone: "Téléphone",
  email: "Courriel",
  address_line_1: "Adresse",
  city: "Ville",
  postal_code: "Code postal",
};

export function useProfileCompleteness() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = useQuery({
    queryKey: ["profile-completeness", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_profile_completeness", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      return data as unknown as ProfileCompleteness;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const updateField = useCallback(
    async (field: string, value: string) => {
      const { data, error } = await supabase.rpc("update_profile_field_partial", {
        p_field: field,
        p_value: value,
      });
      if (error) throw error;
      // Invalidate both profile and completeness queries
      qc.invalidateQueries({ queryKey: ["profile-completeness"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      return data as unknown as ProfileCompleteness;
    },
    [qc]
  );

  const openDrawerIfNeeded = useCallback(() => {
    if (query.data && !query.data.is_complete) {
      setDrawerOpen(true);
    }
  }, [query.data]);

  const missingFieldLabels = (query.data?.missing_fields ?? []).map(
    (f) => FIELD_LABELS[f] || f
  );

  return {
    ...query,
    completeness: query.data,
    isComplete: query.data?.is_complete ?? false,
    score: query.data?.completion_score ?? 0,
    missingFields: query.data?.missing_fields ?? [],
    missingFieldLabels,
    updateField,
    drawerOpen,
    setDrawerOpen,
    openDrawerIfNeeded,
    canBook: query.data?.has_name && query.data?.has_phone && query.data?.has_address,
  };
}
