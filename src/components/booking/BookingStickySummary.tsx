/**
 * Mobile sticky summary bar that appears at the bottom
 * once the user has selected enough booking details.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingStickySummaryProps {
  visible: boolean;
  appointmentTitle?: string;
  dateLabel?: string;
  timeLabel?: string;
  onContinue: () => void;
  ctaLabel?: string;
}

export function BookingStickySummary({
  visible,
  appointmentTitle,
  dateLabel,
  timeLabel,
  onContinue,
  ctaLabel = "Continuer",
}: BookingStickySummaryProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        >
          <div className="bg-card/95 backdrop-blur-xl border-t border-border/40 px-4 py-3 safe-area-bottom">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                {appointmentTitle && (
                  <p className="text-caption font-semibold text-foreground truncate">
                    {appointmentTitle}
                  </p>
                )}
                <div className="flex items-center gap-2 text-caption text-muted-foreground">
                  {dateLabel && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {dateLabel}
                    </span>
                  )}
                  {timeLabel && <span>· {timeLabel}</span>}
                </div>
              </div>
              <Button size="sm" className="gap-1 flex-shrink-0" onClick={onContinue}>
                {ctaLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
