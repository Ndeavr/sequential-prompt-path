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
      max_contractors?: number;
      signature_slots?: number;
      elite_slots?: number;
      premium_slots?: number;
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
      max_contractors?: number;
      signature_slots?: number;
      elite_slots?: number;
      premium_slots?: number;
      is_active?: boolean;
    }) => {
      const { error } = await supabase
        .from("territories")
        .update({ ...updates, updated_at: new Date().toISOString() })
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
      // Create assignment
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

      // Remove from waitlist
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
