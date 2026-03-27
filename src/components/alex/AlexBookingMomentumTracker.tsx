/**
 * AlexBookingMomentumTracker — Visual progression toward conversion.
 * Compact steps indicator for mobile.
 */
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { EngineState } from "@/hooks/useAlexPersuasionEngine";

interface Props {
  state: EngineState;
  bookingReadiness: number;
  className?: string;
}

const STEPS = [
  { key: "understand", label: "Compris" },
  { key: "matched", label: "Trouvé" },
  { key: "prepared", label: "Préparé" },
  { key: "booked", label: "Réservé" },
];

function getActiveStep(state: EngineState, readiness: number): number {
  if (state === "success") return 4;
  if (state === "opening_calendar" || state === "preparing_booking") return 3;
  if (state === "matching" || readiness > 0.4) return 2;
  if (state === "thinking" || state === "predicting") return 1;
  return 0;
}

export default function AlexBookingMomentumTracker({ state, bookingReadiness, className = "" }: Props) {
  const active = getActiveStep(state, bookingReadiness);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <motion.div
              animate={{
                scale: current ? 1.1 : 1,
                backgroundColor: done ? "hsl(var(--primary))" : current ? "hsl(var(--primary) / 0.3)" : "hsl(var(--muted))",
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center"
            >
              {done ? (
                <Check className="w-3 h-3 text-primary-foreground" />
              ) : (
                <span className={`text-[10px] font-bold ${current ? "text-primary" : "text-muted-foreground"}`}>
                  {i + 1}
                </span>
              )}
            </motion.div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-0.5 ${done ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
