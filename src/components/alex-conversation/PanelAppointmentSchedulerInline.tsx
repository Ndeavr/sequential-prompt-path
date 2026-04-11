/**
 * PanelAppointmentSchedulerInline — Full inline booking scheduler
 * that works directly within the chat conversation.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Check, MapPin, User } from "lucide-react";
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

export default function PanelAppointmentSchedulerInline({
  contractorId,
  contractorName,
  conversationSessionId,
  onBooked,
}: Props) {
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    loadSlots();
  }, [contractorId]);

  async function loadSlots() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("alex-inline-booking", {
        body: {
          action: "get_slots",
          contractor_id: contractorId,
          conversation_session_id: conversationSessionId,
        },
      });
      if (data?.slots) setSlots(data.slots);
    } catch (err) {
      console.error("Failed to load slots:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    const slot = slots.find((s) => s.id === selectedId);
    if (!slot) return;

    setConfirming(true);
    try {
      await supabase.functions.invoke("alex-inline-booking", {
        body: {
          action: "confirm_booking",
          contractor_id: contractorId,
          conversation_session_id: conversationSessionId,
          slot_id: slot.id,
          slot_data: slot,
        },
      });
      setConfirmed(true);
      onBooked?.(slot);
    } catch (err) {
      console.error("Booking confirmation failed:", err);
    } finally {
      setConfirming(false);
    }
  }

  if (confirmed) {
    const slot = slots.find((s) => s.id === selectedId);
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5 text-center space-y-2"
      >
        <Check className="h-8 w-8 text-green-500 mx-auto" />
        <p className="text-sm font-semibold text-foreground">Rendez-vous confirmé!</p>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <User className="h-3 w-3" /> {contractorName}
          </p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Calendar className="h-3 w-3" /> {slot?.label}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Créneaux disponibles — {contractorName}
        </h4>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground ml-2">Chargement des disponibilités...</span>
        </div>
      ) : slots.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Aucun créneau disponible pour le moment.
        </p>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 gap-2">
            {slots.map((slot) => (
              <motion.button
                key={slot.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedId(slot.id)}
                className={`rounded-xl border p-3 text-left transition-all flex items-center gap-3 ${
                  selectedId === slot.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/50 bg-background/50 hover:border-primary/30"
                }`}
              >
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-foreground">{slot.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-2 capitalize">{slot.type}</span>
                </div>
                {selectedId === slot.id && (
                  <Check className="h-4 w-4 text-primary ml-auto" />
                )}
              </motion.button>
            ))}
          </div>
        </AnimatePresence>
      )}

      <Button
        onClick={handleConfirm}
        disabled={!selectedId || confirming}
        className="w-full h-10 text-sm"
        size="sm"
      >
        {confirming ? "Confirmation en cours..." : "Confirmer le rendez-vous"}
      </Button>
    </motion.div>
  );
}
