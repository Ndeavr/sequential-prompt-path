/**
 * Clara's compact appointment-setting handoff. The canonical /book/:slug page
 * calculates actual slots and asks for homeowner details. Never claim a
 * reservation before the locked server confirmation returns a booking ID.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface BookingSlot {
  id: string;
  contractorId: string;
  start: string;
  end: string;
  label: string;
  type: string;
  status: string;
}

interface Props {
  contractorId: string;
  contractorName: string;
  conversationSessionId?: string;
  onBooked?: (slot: BookingSlot) => void;
}

export default function PanelAppointmentSchedulerInline({ contractorId, contractorName }: Props) {
  const navigate = useNavigate();
  const [path, setPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setPath(null);
    setMessage(null);
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("alex-inline-booking", {
          body: { action: "get_slots", contractor_id: contractorId },
        });
        if (!alive) return;
        if (error) throw error;
        setPath(typeof data?.booking_path === "string" && data.booking_path.startsWith("/book/")
          ? data.booking_path : null);
        setMessage(typeof data?.message === "string" ? data.message : null);
      } catch {
        if (alive) setMessage("La disponibilité n’est pas accessible pour le moment. Clara peut proposer un suivi.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [contractorId]);

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-4 space-y-3" aria-label="Prendre rendez-vous avec Clara">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">Choisir un rendez-vous avec {contractorName}</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        L’agenda UNPRO tient compte des plages disponibles et des marges configurées.
        Votre rendez-vous n’est confirmé qu’après vérification finale.
      </p>
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground"><Clock className="inline h-4 w-4 mr-2" aria-hidden />Vérification de l’agenda…</p>
      ) : path ? (
        <Button type="button" className="w-full min-h-11" onClick={() => navigate(path)}>
          Voir les disponibilités <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
        </Button>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          {message ?? "Aucune disponibilité confirmée. Demandez une autre date à Clara."}
        </p>
      )}
    </section>
  );
}
