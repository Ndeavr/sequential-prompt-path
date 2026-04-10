import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar, Check, ArrowRight } from "lucide-react";
import type { MockSlot, MockContractor } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  contractor: MockContractor | null;
  slots: MockSlot[];
  onConfirm: (slot: MockSlot) => void;
}

export default function SheetBookingSlots({ open, onClose, contractor, slots, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const filteredSlots = contractor ? slots.filter(s => s.contractorId === contractor.id) : slots;
  const selectedSlot = filteredSlots.find(s => s.id === selected);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] bg-card border-border/60">
        <SheetHeader className="pb-3">
          <SheetTitle className="text-base font-display flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {contractor ? `Disponibilités — ${contractor.name}` : "Créneaux"}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-2 pb-4">
          {filteredSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun créneau disponible</p>
          ) : (
            filteredSlots.map(slot => (
              <button
                key={slot.id}
                onClick={() => setSelected(slot.id)}
                className={`w-full text-left text-sm py-3 px-4 rounded-xl border transition-all flex items-center justify-between ${
                  selected === slot.id
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border/60 text-foreground hover:bg-muted/30"
                }`}
              >
                {slot.label}
                {selected === slot.id && <Check className="w-4 h-4" />}
              </button>
            ))
          )}
        </div>
        {selectedSlot && (
          <button
            onClick={() => onConfirm(selectedSlot)}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 mb-4"
          >
            Confirmer le rendez-vous <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
}
