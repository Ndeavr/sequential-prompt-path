import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Subscribes to real-time changes on the appointments table
 * and invalidates lead queries + shows a toast on new inserts.
 */
export const useLeadRealtime = (contractorId: string | undefined) => {
  const qc = useQueryClient();

  useEffect(() => {
    if (!contractorId) return;

    const channel = supabase
      .channel(`leads-${contractorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appointments",
          filter: `contractor_id=eq.${contractorId}`,
        },
        (payload) => {
          toast.info("🔔 Nouveau rendez-vous reçu !", { duration: 5000 });
          qc.invalidateQueries({ queryKey: ["contractor-leads"] });
          qc.invalidateQueries({ queryKey: ["contractor-appointments"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "appointments",
          filter: `contractor_id=eq.${contractorId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["contractor-leads"] });
          qc.invalidateQueries({ queryKey: ["contractor-appointments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contractorId, qc]);
};
