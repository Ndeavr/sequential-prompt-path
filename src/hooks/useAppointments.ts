import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { computeLeadScore, getDescriptionLengthScore, getProfileCompleteness } from "@/services/leadQualificationService";

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

/* ── Homeowner: create appointment + lead qualification ── */
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
      urgency_level?: string;
      budget_range?: string;
      timeline?: string;
      project_category?: string;
    }) => {
      // 1. Create appointment
      const { data: appt, error } = await supabase
        .from("appointments")
        .insert({ ...input, homeowner_user_id: user!.id })
        .select()
        .single();
      if (error) throw error;

      // 2. Gather signals for lead scoring
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();

      const { count: quoteCount } = await supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);

      const { count: docCount } = await supabase
        .from("storage_documents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);

      const profileCompleteness = getProfileCompleteness(profile);

      // 3. Compute score
      const scoreResult = computeLeadScore({
        notes: input.notes,
        project_category: input.project_category,
        property_linked: !!input.property_id,
        preferred_date: input.preferred_date,
        budget_range: input.budget_range,
        timeline: input.timeline,
        urgency_level: input.urgency_level,
        has_quotes: (quoteCount ?? 0) > 0,
        has_documents: (docCount ?? 0) > 0,
        homeowner_profile_completeness: profileCompleteness,
      });

      // 4. Get contractor city
      const { data: contractor } = await supabase
        .from("contractors")
        .select("city")
        .eq("id", input.contractor_id)
        .maybeSingle();

      // 5. Insert lead qualification
      const { error: leadError } = await supabase
        .from("lead_qualifications")
        .insert({
          appointment_id: appt.id,
          homeowner_user_id: user!.id,
          contractor_id: input.contractor_id,
          score: scoreResult.score,
          project_category: input.project_category,
          city: contractor?.city,
          budget_range: input.budget_range,
          timeline: input.timeline,
          urgency_level: input.urgency_level || "normal",
          description_length_score: getDescriptionLengthScore(input.notes),
          property_linked: !!input.property_id,
          documents_uploaded: (docCount ?? 0) > 0,
          quote_uploaded: (quoteCount ?? 0) > 0,
          homeowner_profile_completeness: profileCompleteness,
          score_factors: scoreResult.factors as any,
        } as any);
      if (leadError) console.error("Lead qualification creation failed:", leadError);

      return appt;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["contractor-leads"] });
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
    },
  });
};

/* ── Contractor: list assigned appointments ── */
export const useContractorAppointments = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contractor-appointments", user?.id],
    queryFn: async () => {
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

/* ── Update appointment status ── */
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
      qc.invalidateQueries({ queryKey: ["contractor-leads"] });
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
