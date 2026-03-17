import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContractorProfile } from "@/hooks/useContractor";
import { useHasActiveSubscription } from "@/hooks/useSubscription";
import { getSlotTypeForPlan, computeOccupancy, hasAvailableSlot } from "@/services/territoryService";

/* ── All active territories ── */
export const useTerritories = () =>
  useQuery({
    queryKey: ["territories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territories")
        .select("*")
        .eq("is_active", true)
        .order("city_name");
      if (error) throw error;
      return data;
    },
  });

/* ── Assignments for a territory ── */
export const useTerritoryAssignments = (territoryId?: string) =>
  useQuery({
    queryKey: ["territory-assignments", territoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_assignments")
        .select("*")
        .eq("territory_id", territoryId!);
      if (error) throw error;
      return data;
    },
    enabled: !!territoryId,
  });

/* ── Contractor's own territories ── */
export const useContractorTerritories = () => {
  const { data: contractor } = useContractorProfile();

  return useQuery({
    queryKey: ["contractor-territories", contractor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_assignments")
        .select("*, territories(*)")
        .eq("contractor_id", contractor!.id)
        .eq("active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!contractor?.id,
  });
};

/* ── Contractor's waitlist entries ── */
export const useContractorWaitlist = () => {
  const { data: contractor } = useContractorProfile();

  return useQuery({
    queryKey: ["contractor-waitlist", contractor?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_waitlist")
        .select("*, territories(*)")
        .eq("contractor_id", contractor!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!contractor?.id,
  });
};

/* ── All assignments for all territories (enriched, for marketplace view) ── */
export const useAllTerritoryAssignments = () =>
  useQuery({
    queryKey: ["all-territory-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_assignments")
        .select("territory_id, slot_type, active");
      if (error) throw error;
      return data;
    },
  });

/* ── Request territory ── */
export const useRequestTerritory = () => {
  const qc = useQueryClient();
  const { data: contractor } = useContractorProfile();
  const { planId } = useHasActiveSubscription();

  return useMutation({
    mutationFn: async (territoryId: string) => {
      if (!contractor?.id) throw new Error("No contractor profile");

      const { data: assignments } = await supabase
        .from("territory_assignments")
        .select("slot_type, active")
        .eq("territory_id", territoryId);

      const { data: territory } = await supabase
        .from("territories")
        .select("*")
        .eq("id", territoryId)
        .single();

      if (!territory) throw new Error("Territory not found");

      const slotType = getSlotTypeForPlan(planId ?? "recrue");
      const occupancy = computeOccupancy(assignments ?? []);
      const available = hasAvailableSlot(
        {
          slots_signature: territory.slots_signature,
          slots_elite: territory.slots_elite,
          slots_premium: territory.slots_premium,
          slots_pro: territory.slots_pro,
          slots_recrue: territory.slots_recrue,
          max_entrepreneurs: territory.max_entrepreneurs,
        },
        occupancy,
        slotType
      );

      if (!available) {
        const { error: wlErr } = await supabase
          .from("territory_waitlist")
          .insert({
            contractor_id: contractor.id,
            territory_id: territoryId,
          });
        if (wlErr && !wlErr.message.includes("duplicate")) throw wlErr;
        return { waitlisted: true };
      }

      const { error } = await supabase.from("territory_assignments").insert({
        contractor_id: contractor.id,
        territory_id: territoryId,
        plan_level: planId ?? "recrue",
        slot_type: slotType,
        active: true,
      });
      if (error) {
        if (error.message.includes("duplicate")) throw new Error("Déjà assigné à ce territoire");
        throw error;
      }

      return { waitlisted: false };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor-territories"] });
      qc.invalidateQueries({ queryKey: ["contractor-waitlist"] });
      qc.invalidateQueries({ queryKey: ["all-territory-assignments"] });
    },
  });
};

/* ── Leave territory ── */
export const useLeaveTerritory = () => {
  const qc = useQueryClient();
  const { data: contractor } = useContractorProfile();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("territory_assignments")
        .delete()
        .eq("id", assignmentId)
        .eq("contractor_id", contractor!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor-territories"] });
      qc.invalidateQueries({ queryKey: ["all-territory-assignments"] });
    },
  });
};

/* ── Leave waitlist ── */
export const useLeaveWaitlist = () => {
  const qc = useQueryClient();
  const { data: contractor } = useContractorProfile();

  return useMutation({
    mutationFn: async (waitlistId: string) => {
      const { error } = await supabase
        .from("territory_waitlist")
        .delete()
        .eq("id", waitlistId)
        .eq("contractor_id", contractor!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor-waitlist"] });
    },
  });
};
