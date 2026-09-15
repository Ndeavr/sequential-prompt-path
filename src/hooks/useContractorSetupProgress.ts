/**
 * useContractorSetupProgress — real setup state of a production contractor
 * account: Profil, Services, Territoire, Calendrier, Disponibilités.
 *
 * Every step reflects real stored data. Nothing is assumed complete.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SetupStepKey = "profile" | "services" | "territory" | "calendar" | "availability";

export interface SetupStep {
  key: SetupStepKey;
  label: string;
  done: boolean;
}

export interface ContractorSetupProgress {
  steps: SetupStep[];
  completedCount: number;
  totalCount: number;
  calendarConnected: boolean;
  calendarNeedsReconnect: boolean;
  calendarLastSyncedAt: string | null;
  calendarProvider: string | null;
  contractorId: string | null;
}

export function useContractorSetupProgress() {
  const { user } = useAuth();

  return useQuery<ContractorSetupProgress>({
    queryKey: ["contractor-setup-progress", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: contractor, error: contractorError } = await supabase
        .from("contractors")
        .select("id, business_name, phone, city")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (contractorError) throw contractorError;

      const contractorId = contractor?.id ?? null;

      const [services, territories, availability, connections] = await Promise.all([
        contractorId
          ? supabase.from("contractor_services").select("id").eq("contractor_id", contractorId).limit(1)
          : Promise.resolve({ data: [], error: null }),
        contractorId
          ? supabase.from("contractor_service_areas").select("id").eq("contractor_id", contractorId).limit(1)
          : Promise.resolve({ data: [], error: null }),
        contractorId
          ? supabase
              .from("booking_availability")
              .select("id")
              .eq("contractor_id", contractorId)
              .eq("is_active", true)
              .limit(1)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("calendar_connections")
          .select("provider, connection_status, last_synced_at")
          .eq("user_id", user!.id)
          .order("connected_at", { ascending: false }),
      ]);

      const activeConnection = (connections.data ?? []).find(
        (c) => c.connection_status === "connected" || c.connection_status === "subscribed_external",
      ) ?? null;
      const revoked = (connections.data ?? []).some((c) => c.connection_status === "revoked");

      const steps: SetupStep[] = [
        {
          key: "profile",
          label: "Profil",
          done: Boolean(contractor?.business_name && contractor?.phone),
        },
        { key: "services", label: "Services", done: (services.data ?? []).length > 0 },
        { key: "territory", label: "Territoire", done: (territories.data ?? []).length > 0 },
        { key: "calendar", label: "Calendrier", done: Boolean(activeConnection) },
        { key: "availability", label: "Disponibilités", done: (availability.data ?? []).length > 0 },
      ];

      return {
        steps,
        completedCount: steps.filter((s) => s.done).length,
        totalCount: steps.length,
        calendarConnected: Boolean(activeConnection),
        calendarNeedsReconnect: !activeConnection && revoked,
        calendarLastSyncedAt: activeConnection?.last_synced_at ?? null,
        calendarProvider: activeConnection?.provider ?? null,
        contractorId,
      };
    },
  });
}
