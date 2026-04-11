/**
 * PanelAlexBookingScheduler — Inline slot picker in chat.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingSchedulerData, MockSlot } from "./types";

interface Props {
  data: BookingSchedulerData;
  onConfirm?: (slot: MockSlot) => void;
}

export default function PanelAlexBookingScheduler({ data, onConfirm }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    const slot = data.slots.find(s => s.id === selectedId);
    if (slot) {
      setConfirmed(true);
      onConfirm?.(slot);
    }
  };

  if (confirmed) {
    const slot = data.slots.find(s => s.id === selectedId);
    return (
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-center">
        <Check className="h-6 w-6 text-green-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">Rendez-vous confirmé</p>
        <p className="text-xs text-muted-foreground mt-1">{data.contractorName} · {slot?.label}</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          Disponibilités — {data.contractorName}
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {data.slots.map(slot => (
          <button
            key={slot.id}
            onClick={() => setSelectedId(slot.id)}
            className={`rounded-xl border p-2.5 text-left transition-all ${
              selectedId === slot.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border/50 bg-background/50 hover:border-primary/30"
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {slot.label}
            </span>
          </button>
        ))}
      </div>

      <Button
        onClick={handleConfirm}
        disabled={!selectedId}
        className="w-full h-9 text-sm"
        size="sm"
      >
        Confirmer le rendez-vous
      </Button>
    </motion.div>
  );
}
