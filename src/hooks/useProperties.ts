import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useProperties = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["properties", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useProperty = (id: string | undefined) => {
  return useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

/** Thrown when the plan's property limit is reached. Carries upgrade context. */
export class PropertyLimitError extends Error {
  limit: number | null;
  planCode: string;
  upgradeTarget: string | null;
  constructor(limit: number | null, planCode: string, upgradeTarget: string | null) {
    super(
      limit === 1
        ? "Votre forfait actuel comprend 1 propriété. Gold permet jusqu'à 3 propriétés."
        : `Votre forfait comprend jusqu'à ${limit ?? 1} propriétés.`,
    );
    this.name = "PropertyLimitError";
    this.limit = limit;
    this.planCode = planCode;
    this.upgradeTarget = upgradeTarget;
  }
}

export const useCreateProperty = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (property: { address: string; city?: string; province?: string; postal_code?: string; property_type?: string; year_built?: number; square_footage?: number }) => {
      // Server-authoritative plan check before touching the table.
      const { data: check, error: checkError } = await supabase.rpc(
        "homeowner_can_add_property" as any,
        { _user_id: user!.id },
      );
      if (checkError) throw checkError;
      const c = (check ?? {}) as Record<string, any>;
      if (c.allowed === false) {
        throw new PropertyLimitError(c.limit ?? null, String(c.plan_code ?? ""), c.upgrade_target ?? null);
      }

      const { data, error } = await supabase.from("properties").insert({ ...property, user_id: user!.id }).select().single();
      if (error) {
        if (String(error.message).includes("HOMEOWNER_PROPERTY_LIMIT_REACHED")) {
          throw new PropertyLimitError(c.limit ?? null, String(c.plan_code ?? ""), c.upgrade_target ?? null);
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["homeowner-can-add-property"] });
      qc.invalidateQueries({ queryKey: ["homeowner-usage"] });
    },
  });
};

/** Activate one property and deactivate the others (Gold → Plus downgrade path). */
export const useSetActiveProperty = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { error: offErr } = await supabase
        .from("properties")
        .update({ is_active: false } as any)
        .eq("user_id", user!.id)
        .neq("id", propertyId);
      if (offErr) throw offErr;

      const { error: onErr } = await supabase
        .from("properties")
        .update({ is_active: true } as any)
        .eq("id", propertyId)
        .eq("user_id", user!.id);
      if (onErr) throw onErr;
      return propertyId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["homeowner-can-add-property"] });
    },
  });
};


export const useUpdateProperty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; address?: string; city?: string; province?: string; postal_code?: string; property_type?: string; year_built?: number; square_footage?: number }) => {
      const { data, error } = await supabase.from("properties").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
};
