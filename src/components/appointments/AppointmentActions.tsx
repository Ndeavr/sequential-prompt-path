import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AppointmentActionsProps {
  appointmentId: string;
  status: string;
  role: "homeowner" | "contractor";
  onDone?: () => void;
}

const AppointmentActions = ({ appointmentId, status, role, onDone }: AppointmentActionsProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);

  const functionName = role === "homeowner" ? "homeowner-manage-appointment" : "contractor-manage-appointment";

  const act = async (action: string, extra?: Record<string, unknown>) => {
    setLoading(action);
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { appointmentId, action, ...extra },
    });
    if (error || !data?.ok) {
      toast.error(error?.message || data?.error || "Erreur");
    } else {
      toast.success("Action effectuée.");
      onDone?.();
    }
    setLoading(null);
    setShowReason(false);
    setShowReschedule(false);
  };

  const canConfirm = ["requested", "scheduled", "reschedule_requested"].includes(status);
  const canCancel = !["cancelled", "completed"].includes(status);
  const canReschedule = role === "contractor" && ["confirmed", "scheduled", "reschedule_requested"].includes(status);
  const canComplete = role === "contractor" && ["confirmed", "scheduled"].includes(status);
  const canRequestReschedule = role === "homeowner" && ["confirmed", "scheduled"].includes(status);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canConfirm && (
          <Button size="sm" onClick={() => act("confirm")} disabled={!!loading}>
            {loading === "confirm" ? "..." : "Confirmer"}
          </Button>
        )}
        {canComplete && (
          <Button size="sm" variant="default" onClick={() => act("complete")} disabled={!!loading}>
            {loading === "complete" ? "..." : "Marquer terminé"}
          </Button>
        )}
        {canRequestReschedule && (
          <Button size="sm" variant="outline" onClick={() => setShowReason(true)} disabled={!!loading}>
            Demander replanification
          </Button>
        )}
        {canReschedule && (
          <Button size="sm" variant="outline" onClick={() => setShowReschedule(true)} disabled={!!loading}>
            Replanifier
          </Button>
        )}
        {canCancel && (
          <Button size="sm" variant="destructive" onClick={() => { setShowReason(true); }} disabled={!!loading}>
            Annuler
          </Button>
        )}
      </div>

      {showReason && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
          <Textarea placeholder="Raison (optionnel)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => act("cancel", { reason })} disabled={!!loading}>
              Confirmer annulation
            </Button>
            {canRequestReschedule && (
              <Button size="sm" variant="outline" onClick={() => act("reschedule_request", { reason })} disabled={!!loading}>
                Demander replanification
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setShowReason(false)}>Fermer</Button>
          </div>
        </div>
      )}

      {showReschedule && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Début</label>
              <input type="datetime-local" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fin</label>
              <input type="datetime-local" value={rescheduleEnd} onChange={(e) => setRescheduleEnd(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            </div>
          </div>
          <Textarea placeholder="Raison (optionnel)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => act("reschedule", { startsAt: rescheduleDate, endsAt: rescheduleEnd, reason })} disabled={!!loading || !rescheduleDate || !rescheduleEnd}>
              Confirmer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowReschedule(false)}>Fermer</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentActions;
