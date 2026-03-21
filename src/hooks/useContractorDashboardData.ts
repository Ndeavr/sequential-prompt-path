/**
 * UNPRO — Contractor Dashboard Data Hook
 * Aggregates real metrics from notifications, match_decisions, appointments, contractor_scores.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useContractorProfile } from "./useContractor";

/** Real notifications from DB */
export const useContractorNotifications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contractor-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });
};

/** Match decisions history */
export const useContractorMatchDecisions = () => {
  const { data: profile } = useContractorProfile();
  return useQuery({
    queryKey: ["contractor-match-decisions", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_decisions")
        .select("*")
        .eq("contractor_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });
};

/** Contractor scores (from feedback loop) */
export const useContractorScores = () => {
  const { data: profile } = useContractorProfile();
  return useQuery({
    queryKey: ["contractor-scores", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_scores")
        .select("*")
        .eq("contractor_id", profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });
};

/** Weekly appointment aggregation for performance chart */
export const useWeeklyAppointmentStats = () => {
  const { data: profile } = useContractorProfile();
  return useQuery({
    queryKey: ["contractor-weekly-stats", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, status, created_at, completed_at")
        .eq("contractor_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const appointments = data ?? [];
      const now = new Date();
      const weeks: { label: string; total: number; completed: number; revenue: number }[] = [];

      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekAppts = appointments.filter(a => {
          const d = new Date(a.created_at);
          return d >= weekStart && d < weekEnd;
        });

        const completed = weekAppts.filter(a => a.status === "completed").length;

        weeks.push({
          label: `S${8 - i}`,
          total: weekAppts.length,
          completed,
          revenue: completed * 8500,
        });
      }

      return {
        weeks,
        totalAppointments: appointments.length,
        completedAppointments: appointments.filter(a => a.status === "completed").length,
        cancelledAppointments: appointments.filter(a => a.status === "cancelled").length,
        conversionRate: appointments.length > 0
          ? Math.round((appointments.filter(a => a.status === "completed" || a.status === "accepted").length / appointments.length) * 100)
          : 0,
      };
    },
    enabled: !!profile?.id,
  });
};

/** Service areas count */
export const useContractorServiceAreasCount = () => {
  const { data: profile } = useContractorProfile();
  return useQuery({
    queryKey: ["contractor-areas-count", profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contractor_service_areas")
        .select("id", { count: "exact", head: true })
        .eq("contractor_id", profile!.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profile?.id,
  });
};

/** Feedback received */
export const useContractorFeedback = () => {
  const { data: profile } = useContractorProfile();
  return useQuery({
    queryKey: ["contractor-feedback", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_feedback")
        .select("*")
        .eq("contractor_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });
};
