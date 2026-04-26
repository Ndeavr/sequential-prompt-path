/**
 * ModalWhyThisPro — bottom sheet listing comparative reasons.
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar } from "lucide-react";
import type { RecommendedPro } from "@/stores/copilotConversationStore";

interface Props {
  open: boolean;
  pro: RecommendedPro | null;
  onClose: () => void;
  onBook: () => void;
}

const COMPARISON_POINTS = [
  "Meilleure expertise spécifique à votre problème",
  "Plus rapide disponible cette semaine",
  "Plus forte satisfaction clients récents",
  "Distance optimale pour votre secteur",
  "Prix généralement compétitif",
];

export default function ModalWhyThisPro({ open, pro, onClose, onBook }: Props) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-[hsl(220_45%_7%)] border-t border-white/10 text-white rounded-t-3xl max-h-[80vh]"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-white">
            Pourquoi {pro?.name ?? "ce pro"}?
          </SheetTitle>
          <p className="text-[13px] text-white/70">
            Comparé aux autres options disponibles aujourd'hui:
          </p>
        </SheetHeader>

        <ul className="mt-4 space-y-3">
          {COMPARISON_POINTS.map((pt) => (
            <li key={pt} className="flex items-start gap-3 text-[14px] text-white/90">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{pt}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={onBook}
          className="w-full mt-6 h-12 rounded-xl gap-2 bg-gradient-to-r from-[hsl(220_100%_55%)] to-[hsl(207_100%_60%)] text-white"
        >
          <Calendar className="w-4 h-4" /> Prendre rendez-vous
        </Button>
      </SheetContent>
    </Sheet>
  );
}
