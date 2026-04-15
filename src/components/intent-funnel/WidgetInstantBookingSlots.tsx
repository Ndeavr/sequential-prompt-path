/**
 * WidgetInstantBookingSlots — Calendar grid with available slots.
 */
import { motion } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";
import type { BookingSlot } from "@/hooks/useIntentFunnel";

interface Props {
  slots: BookingSlot[];
  loading: boolean;
  onSelectSlot: (slotId: string) => void;
}

export default function WidgetInstantBookingSlots({ slots, loading, onSelectSlot }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Group by date
  const grouped = slots.reduce<Record<string, BookingSlot[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([date, daySlots], i) => (
        <motion.div
          key={date}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <p className="text-xs font-medium text-muted-foreground mb-2 capitalize">{formatDate(date)}</p>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => slot.available && onSelectSlot(slot.id)}
                disabled={!slot.available}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                  border transition-all duration-200 ${
                  slot.available
                    ? "border-border/60 bg-card/60 text-foreground hover:border-primary/50 hover:bg-primary/10 active:scale-95"
                    : "border-border/30 bg-muted/20 text-muted-foreground/40 cursor-not-allowed line-through"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {slot.time}
              </button>
            ))}
          </div>
        </motion.div>
      ))}

      {slots.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Aucun créneau disponible pour le moment.</p>
        </div>
      )}
    </div>
  );
}
