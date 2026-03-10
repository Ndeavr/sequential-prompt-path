import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/* ── Homeowner: list own appointments ── */
export const useAppointments = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["appointments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, contractors(business_name, city, specialty), properties(address, city)")
        .eq("homeowner_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

/* ── Homeowner: create appointment ── */
export const useCreateAppointment = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      contractor_id: string;
      property_id?: string;
      preferred_date?: string;
      preferred_time_window?: string;
      contact_preference?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("appointments")
        .insert({ ...input, homeowner_user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
};

/* ── Contractor: list assigned appointments ── */
export const useContractorAppointments = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contractor-appointments", user?.id],
    queryFn: async () => {
      // Get contractor id for current user
      const { data: contractor } = await supabase
        .from("contractors")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      if (!contractor) return [];

      const { data, error } = await supabase
        .from("appointments")
        .select("*, properties(address, city)")
        .eq("contractor_id", contractor.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

/* ── Contractor/Homeowner: update appointment status ── */
export const useUpdateAppointmentStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "scheduled") updates.scheduled_at = new Date().toISOString();
      const { error } = await supabase.from("appointments").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["contractor-appointments"] });
      qc.invalidateQueries({ queryKey: ["admin-appointments"] });
    },
  });
};

/* ── Admin: list all appointments ── */
export const useAdminAppointments = () =>
  useQuery({
    queryKey: ["admin-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, contractors(business_name), properties(address, city)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
