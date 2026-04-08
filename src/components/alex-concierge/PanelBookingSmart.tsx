/**
 * PanelBookingSmart — Pre-booking confirmation panel.
 * "On bloque ça?" — single-tap confirmation.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchedContractor } from "@/services/alexStateMachine";

interface Props {
  contractor: MatchedContractor;
  serviceType: string | null;
  onConfirm: (datetime?: string) => void;
  onBack: () => void;
}

const TIME_SLOTS = [
  { label: "Demain matin", value: "tomorrow_am", icon: "☀️" },
  { label: "Demain après-midi", value: "tomorrow_pm", icon: "🌤️" },
  { label: "Cette semaine", value: "this_week", icon: "📅" },
  { label: "Dès que possible", value: "asap", icon: "⚡" },
];

export default function PanelBookingSmart({ contractor, serviceType, onConfirm, onBack }: Props) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm(selectedSlot || undefined);
  };

  if (confirmed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="bg-card/90 backdrop-blur-xl border border-primary/20 rounded-2xl p-6 text-center shadow-xl">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
          >
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          </motion.div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Rendez-vous confirmé</h3>
          <p className="text-sm text-muted-foreground mb-1">{contractor.companyName}</p>
          <p className="text-xs text-muted-foreground">
            {serviceType && `${serviceType} • `}
            {selectedSlot ? TIME_SLOTS.find(s => s.value === selectedSlot)?.label : "Dès que possible"}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">On bloque ça?</h3>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Rendez-vous avec <span className="font-medium text-foreground">{contractor.companyName}</span>
          {serviceType && ` pour ${serviceType}`}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.value}
              onClick={() => setSelectedSlot(slot.value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                selectedSlot === slot.value
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40"
              }`}
            >
              <span>{slot.icon}</span>
              <span>{slot.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleConfirm} className="flex-1 h-11" disabled={!selectedSlot}>
            Confirmer
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button variant="ghost" onClick={onBack} className="h-11 px-4">
            Retour
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
