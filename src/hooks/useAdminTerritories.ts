import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ── Admin: all territories (including inactive) ── */
export const useAdminTerritories = () =>
  useQuery({
    queryKey: ["admin-territories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territories")
        .select("*")
        .order("city_name");
      if (error) throw error;
      return data;
    },
  });

/* ── Admin: territory assignments with contractor info ── */
export const useAdminTerritoryAssignments = (territoryId?: string) =>
  useQuery({
    queryKey: ["admin-territory-assignments", territoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_assignments")
        .select("*, contractors(id, business_name, aipp_score, city)")
        .eq("territory_id", territoryId!);
      if (error) throw error;
      return data;
    },
    enabled: !!territoryId,
  });

/* ── Admin: territory waitlist ── */
export const useAdminTerritoryWaitlist = (territoryId?: string) =>
  useQuery({
    queryKey: ["admin-territory-waitlist", territoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_waitlist")
        .select("*, contractors(id, business_name, aipp_score)")
        .eq("territory_id", territoryId!);
      if (error) throw error;
      return data;
    },
    enabled: !!territoryId,
  });

/* ── Admin: create territory ── */
export const useCreateTerritory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (territory: {
      city_slug: string;
      city_name: string;
      category_slug: string;
      category_name: string;
      max_entrepreneurs?: number;
      slots_signature?: number;
      slots_elite?: number;
      slots_premium?: number;
      slots_pro?: number;
      slots_recrue?: number;
      province_code?: string;
      region_name?: string;
      market_tier?: string;
    }) => {
      const { error } = await supabase.from("territories").insert(territory);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-territories"] }),
  });
};

/* ── Admin: update territory ── */
export const useUpdateTerritory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      max_entrepreneurs?: number;
      slots_signature?: number;
      slots_elite?: number;
      slots_premium?: number;
      slots_pro?: number;
      slots_recrue?: number;
      is_active?: boolean;
      status?: string;
      market_tier?: string;
    }) => {
      const { error } = await supabase
        .from("territories")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-territories"] }),
  });
};

/* ── Admin: toggle assignment active ── */
export const useToggleAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("territory_assignments")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-territory-assignments"] });
    },
  });
};

/* ── Admin: approve from waitlist ── */
export const useApproveFromWaitlist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      waitlistEntry,
      slotType,
      planLevel,
    }: {
      waitlistEntry: { id: string; contractor_id: string; territory_id: string };
      slotType: string;
      planLevel: string;
    }) => {
      const { error: assignErr } = await supabase
        .from("territory_assignments")
        .insert({
          contractor_id: waitlistEntry.contractor_id,
          territory_id: waitlistEntry.territory_id,
          plan_level: planLevel,
          slot_type: slotType,
          active: true,
        });
      if (assignErr) throw assignErr;

      const { error: wlErr } = await supabase
        .from("territory_waitlist")
        .delete()
        .eq("id", waitlistEntry.id);
      if (wlErr) throw wlErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-territory-assignments"] });
      qc.invalidateQueries({ queryKey: ["admin-territory-waitlist"] });
    },
  });
};

/* ── Admin: categories ── */
export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("priority");
      if (error) throw error;
      return data;
    },
  });

/* ── Admin: service areas ── */
export const useServiceAreas = () =>
  useQuery({
    queryKey: ["service-areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_areas")
        .select("*")
        .eq("is_active", true)
        .order("city_name");
      if (error) throw error;
      return data;
    },
  });

/* ── Admin: generation logs ── */
export const useGenerationLogs = () =>
  useQuery({
    queryKey: ["generation-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_generation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

/* ── Admin: generate territories via RPC ── */
export const useGenerateTerritories = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      p_city_slugs?: string[] | null;
      p_category_slugs?: string[] | null;
      p_mode: string;
      p_overwrite_existing_capacities?: boolean;
      p_generation_source?: string;
    }) => {
      const { data, error } = await supabase.rpc("generate_territories", {
        p_city_slugs: params.p_city_slugs ?? null,
        p_category_slugs: params.p_category_slugs ?? null,
        p_mode: params.p_mode,
        p_overwrite_existing_capacities: params.p_overwrite_existing_capacities ?? false,
        p_generation_source: params.p_generation_source ?? "admin_ui",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-territories"] });
      qc.invalidateQueries({ queryKey: ["generation-logs"] });
    },
  });
};
