import { Calculator, MessageCircle, MapPin, Rocket } from "lucide-react";

interface Props {
  onCalculate: () => void;
  onAlex: () => void;
  onCheckCity: () => void;
  onActivate: () => void;
  hasResults: boolean;
}

export default function StickyMobileGoalCTA({ onCalculate, onAlex, onCheckCity, onActivate, hasResults }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-border/50 bg-background/90 backdrop-blur-xl px-2 py-2 safe-area-inset-bottom">
      <div className="grid grid-cols-4 gap-1">
        <button onClick={onCalculate} className="flex flex-col items-center gap-0.5 py-1.5 text-muted-foreground hover:text-primary transition-colors">
          <Calculator className="w-4 h-4" />
          <span className="text-[10px]">Calcul</span>
        </button>
        <button onClick={onAlex} className="flex flex-col items-center gap-0.5 py-1.5 text-muted-foreground hover:text-accent transition-colors">
          <MessageCircle className="w-4 h-4" />
          <span className="text-[10px]">Alex</span>
        </button>
        <button onClick={onCheckCity} className="flex flex-col items-center gap-0.5 py-1.5 text-muted-foreground hover:text-warning transition-colors">
          <MapPin className="w-4 h-4" />
          <span className="text-[10px]">Ville</span>
        </button>
        <button onClick={onActivate} className={`flex flex-col items-center gap-0.5 py-1.5 transition-colors ${hasResults ? "text-primary" : "text-muted-foreground"}`}>
          <Rocket className="w-4 h-4" />
          <span className="text-[10px]">Activer</span>
        </button>
      </div>
    </div>
  );
}
