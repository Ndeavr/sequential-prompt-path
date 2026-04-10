import { motion } from "framer-motion";
import { CalendarCheck, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  contractorName: string;
  specialty: string;
  score: number;
  nextSlotLabel?: string;
  onBook?: () => void;
}

export default function CardAlexBookingNextStep({ contractorName, specialty, score, nextSlotLabel, onBook }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider">
        <CalendarCheck className="w-3.5 h-3.5" />
        Prochaine étape
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{contractorName}</p>
        <p className="text-xs text-muted-foreground">{specialty}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-xs">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="font-medium text-foreground">{score}/100</span>
        </div>
        {nextSlotLabel && (
          <span className="text-xs text-muted-foreground">
            Prochain créneau : {nextSlotLabel}
          </span>
        )}
      </div>

      <Button
        size="sm"
        className="w-full gap-1"
        onClick={onBook}
      >
        <CalendarCheck className="w-3.5 h-3.5" />
        Réserver maintenant
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </motion.div>
  );
}
