/**
 * CardAvailableSlotsAnimated — Premium slot picker with suggested badge.
 * 2x2 grid, glow on selection, animated transitions.
 */
import { motion } from "framer-motion";
import { Calendar, Check, Star } from "lucide-react";

interface Slot {
  id: string;
  label: string;
  isSuggested?: boolean;
}

interface Props {
  slots: Slot[];
  selectedId?: string;
  confirmedId?: string;
  onSelect: (slot: Slot) => void;
  delay?: number;
}

export default function CardAvailableSlotsAnimated({ slots, selectedId, confirmedId, onSelect, delay = 0 }: Props) {
  const isLocked = !!confirmedId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94], delay }}
      className="w-full max-w-[88%] ml-10 rounded-xl overflow-hidden"
    >
      <div
        className="p-[1px] rounded-xl"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.3), hsl(262 80% 50% / 0.2))",
        }}
      >
        <div
          className="rounded-xl px-4 py-3.5"
          style={{
            background: "linear-gradient(135deg, hsl(var(--card) / 0.95), hsl(var(--card) / 0.85))",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Créneaux disponibles</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {slots.map((slot, i) => {
              const isSelected = selectedId === slot.id;
              const isConfirmed = confirmedId === slot.id;

              return (
                <motion.button
                  key={slot.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: delay + 0.1 + i * 0.08, duration: 0.25 }}
                  onClick={() => !isLocked && onSelect(slot)}
                  disabled={isLocked}
                  className={`relative text-xs py-3 px-2.5 rounded-xl border transition-all text-center font-medium ${
                    isConfirmed
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : isSelected
                      ? "bg-primary/15 border-primary/50 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                      : isLocked
                      ? "border-border/30 text-muted-foreground/50 cursor-default"
                      : "border-border/40 text-foreground hover:bg-muted/40 hover:border-primary/30 active:scale-[0.97]"
                  }`}
                >
                  {slot.isSuggested && !isConfirmed && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                      <Star className="w-2 h-2 text-amber-400 fill-amber-400" />
                      <span className="text-[9px] text-amber-400 font-semibold">Suggéré</span>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-1">
                    {(isSelected || isConfirmed) && <Check className="w-3 h-3" />}
                    <span>{slot.label}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
