import { motion } from "framer-motion";
import { Calendar, Check } from "lucide-react";
import type { MockSlot } from "./types";

interface Props {
  slots: MockSlot[];
  selectedId?: string;
  onSelect: (slot: MockSlot) => void;
}

export default function CardAvailabilitySlot({ slots, selectedId, onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-[90%] ml-9 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-3.5"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <Calendar className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Créneaux disponibles</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {slots.map(slot => (
          <button
            key={slot.id}
            onClick={() => onSelect(slot)}
            className={`text-xs py-2.5 px-2 rounded-lg border transition-all text-center font-medium ${
              selectedId === slot.id
                ? "bg-primary/15 border-primary text-primary"
                : "border-border/60 text-foreground hover:bg-muted/40"
            }`}
          >
            {selectedId === slot.id && <Check className="w-3 h-3 inline mr-1" />}
            {slot.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
