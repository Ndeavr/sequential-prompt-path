import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Star, MapPin, Clock, Shield, ChevronRight } from "lucide-react";
import type { MockContractor } from "./types";

interface Props {
  contractor: MockContractor | null;
  open: boolean;
  onClose: () => void;
  onBooking?: () => void;
}

export default function SheetEntrepreneurDetails({ contractor, open, onClose, onBooking }: Props) {
  if (!contractor) return null;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] bg-card border-border/60">
        <SheetHeader className="pb-3">
          <SheetTitle className="text-base font-display">{contractor.name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pb-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{contractor.city}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Disponible dans {contractor.delayDays}j</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-primary text-sm font-semibold">
              <Star className="w-4 h-4" /> Score UNPRO : {contractor.score}/100
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1.5">Spécialité</h4>
            <p className="text-sm text-muted-foreground">{contractor.specialty}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1.5">Certifications</h4>
            <div className="flex flex-wrap gap-1.5">
              {contractor.badges.map(b => (
                <span key={b} className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent font-medium flex items-center gap-1">
                  <Shield className="w-3 h-3" />{b}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onBooking}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
          >
            Voir les disponibilités <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
