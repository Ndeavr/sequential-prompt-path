/**
 * AlexBookingCTA — Inline booking action card in conversation.
 */
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AlexBookingCTAProps {
  contractorId?: string;
  label?: string;
  onBook?: () => void;
}

export default function AlexBookingCTA({ contractorId, label, onBook }: AlexBookingCTAProps) {
  const navigate = useNavigate();

  const handleBook = () => {
    if (onBook) {
      onBook();
    } else if (contractorId) {
      navigate(`/book/${contractorId}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] to-accent/[0.04] backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{label || "Prêt à réserver?"}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> Créneaux disponibles cette semaine
          </p>
        </div>
      </div>

      <Button
        onClick={handleBook}
        className="w-full rounded-xl h-10 text-xs font-bold bg-gradient-to-r from-primary to-accent text-white border-0 gap-1.5 hover:brightness-110"
      >
        <Calendar className="w-3 h-3" /> Voir les disponibilités <ArrowRight className="w-3 h-3" />
      </Button>
    </motion.div>
  );
}