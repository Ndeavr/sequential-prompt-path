/**
 * CardContractorCalendarSetup — calendar connection step for a production
 * contractor account. Shown right after plan activation and on the dashboard.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Check, CircleDashed, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useContractorSetupProgress } from "@/hooks/useContractorSetupProgress";
import { useCalendarConversionTracking } from "@/hooks/useCalendarConnection";

interface Props {
  /** Where the contractor lands after the calendar flow. */
  returnTo?: string;
  surface?: string;
  compact?: boolean;
}

export default function CardContractorCalendarSetup({
  returnTo = "/entrepreneur/dashboard",
  surface = "dashboard",
  compact = false,
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { track } = useCalendarConversionTracking();
  const { data, isLoading } = useContractorSetupProgress();
  const [syncing, setSyncing] = useState(false);

  if (isLoading || !data) return null;

  const connected = data.calendarConnected;

  const goConnect = () => {
    void track({
      surface,
      role_context: "contractor",
      event_type: "contractor_calendar_connection_started",
    });
    const params = new URLSearchParams({ role: "contractor", surface, return_to: returnTo });
    navigate(`/calendar/connect?${params.toString()}`);
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("calendar-freebusy-sync", {
        body: { days: 45 },
      });
      if (error) throw error;
      const revoked = (result?.results ?? []).some(
        (r: { status?: string }) => r.status === "revoked",
      );
      if (revoked) {
        toast.error("L'accès à votre calendrier a été retiré. Reconnectez-le pour continuer.");
      } else if (result?.synced) {
        toast.success("Vos disponibilités sont à jour.");
      } else {
        toast.message("Aucune période occupée à importer pour le moment.");
      }
      await queryClient.invalidateQueries({ queryKey: ["contractor-setup-progress"] });
    } catch {
      toast.error("La synchronisation n'a pas fonctionné. Réessayez dans un moment.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card/70 p-5 text-left"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">
            {connected ? "Calendrier connecté" : "Connectons votre calendrier"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {connected
              ? "Je tiens maintenant compte de vos disponibilités avant de proposer un rendez-vous."
              : "Votre forfait est activé. Connectons maintenant votre calendrier pour qu'UNPRO puisse vous proposer des rendez-vous aux bons moments."}
          </p>

          {connected && data.calendarLastSyncedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Dernière synchronisation :{" "}
              {new Date(data.calendarLastSyncedAt).toLocaleString("fr-CA", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          )}

          {data.calendarNeedsReconnect && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              L'accès à votre calendrier a été retiré. Reconnectez-le pour recevoir des rendez-vous.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={goConnect} className="rounded-full">
              {connected ? "Gérer mon calendrier" : "Connecter mon calendrier"}
            </Button>
            {connected && (
              <Button
                variant="outline"
                onClick={syncNow}
                disabled={syncing}
                className="rounded-full"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Synchronisation…" : "Synchroniser"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {!compact && (
        <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/40 pt-4">
          {data.steps.map((step) => (
            <li key={step.key} className="flex items-center gap-1.5 text-sm">
              {step.done ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <CircleDashed className="w-4 h-4 text-muted-foreground" />
              )}
              <span className={step.done ? "text-foreground" : "text-muted-foreground"}>
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
