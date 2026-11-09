/**
 * PanelAppointmentSchedulerInline — Clara's inline view of real appointment times.
 *
 * Times come only from the canonical slot engine (the same one used by
 * /book/:slug/:typeSlug): contractor hours (America/Toronto), buffers, travel
 * time, blackouts, existing bookings and calendar busy windows (times only).
 * No time is invented, nothing is confirmed here: the booking itself is made on
 * the canonical booking page, which records it server-side.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  computeSmartSlots,
  fetchAppointmentTypes,
  type SlotCandidate,
} from "@/services/bookingSlotEngine";
import { resolveClaraBookingGate } from "@/services/clara/claraBookingSlots";

interface Props {
  contractorId: string;
  contractorName: string;
  appointmentTypeId?: string;
  conversationSessionId?: string;
  onSlotChosen?: (slot: SlotCandidate) => void;
}

const HORIZON_DAYS = 14;
const MAX_SHOWN = 5;

type State =
  | { kind: "loading" }
  | { kind: "blocked"; message: string }
  | { kind: "error" }
  | { kind: "ready"; slots: SlotCandidate[]; bookingPath: string | null; typeTitle: string };

export default function PanelAppointmentSchedulerInline({
  contractorId,
  contractorName,
  appointmentTypeId,
  onSlotChosen,
}: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    setState({ kind: "loading" });
    setSelected(null);
    (async () => {
      try {
        const { data: contractor, error } = await supabase
          .from("contractors")
          .select("id, slug, public_status")
          .eq("id", contractorId)
          .maybeSingle();
        if (error) throw error;
        const types = await fetchAppointmentTypes(contractorId);
        const gate = resolveClaraBookingGate({
          contractorId,
          publicStatus: (contractor as { public_status?: string } | null)?.public_status,
          slug: (contractor as { slug?: string } | null)?.slug,
          types,
          appointmentTypeId,
        });
        if (!gate.ok) {
          if (live) setState({ kind: "blocked", message: gate.message });
          return;
        }
        const from = new Date();
        const to = new Date(from.getTime() + HORIZON_DAYS * 86400000);
        const result = await computeSmartSlots({
          contractorId,
          appointmentTypeId: gate.type.id,
          dateFrom: from,
          dateTo: to,
        });
        if (live) {
          setState({
            kind: "ready",
            slots: result.slots.slice(0, MAX_SHOWN),
            bookingPath: gate.bookingPath,
            typeTitle: gate.type.title,
          });
        }
      } catch {
        if (live) setState({ kind: "error" });
      }
    })();
    return () => {
      live = false;
    };
  }, [contractorId, appointmentTypeId]);

  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Disponibilités — {contractorName}
        </h4>
      </div>

      {state.kind === "loading" && (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground ml-2">Recherche des disponibilités…</span>
        </div>
      )}

      {state.kind === "blocked" && (
        <p className="text-sm text-muted-foreground text-center py-4">{state.message}</p>
      )}

      {state.kind === "error" && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Je n'arrive pas à consulter les disponibilités pour le moment. Réessayez dans quelques instants.
        </p>
      )}

      {state.kind === "ready" && state.slots.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucune disponibilité dans les {HORIZON_DAYS} prochains jours.
        </p>
      )}

      {state.kind === "ready" && state.slots.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">{state.typeTitle} · heure de Montréal</p>
          <div className="grid grid-cols-1 gap-2">
            {state.slots.map((slot, i) => (
              <button
                key={slot.start.toISOString()}
                type="button"
                onClick={() => {
                  setSelected(i);
                  onSlotChosen?.(slot);
                }}
                className={`rounded-xl border p-3 text-left transition-all flex items-center gap-3 ${
                  selected === i
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/50 bg-background/50 hover:border-primary/30"
                }`}
              >
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{slot.label}</span>
                {selected === i && <Check className="h-4 w-4 text-primary ml-auto" />}
              </button>
            ))}
          </div>
          {state.bookingPath && selected !== null && (
            <Button asChild className="w-full h-10 text-sm" size="sm">
              <Link to={state.bookingPath}>Continuer la réservation</Link>
            </Button>
          )}
        </>
      )}
    </motion.div>
  );
}
