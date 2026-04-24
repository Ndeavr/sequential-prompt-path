import { Mic, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { onVoice: () => void; onChat: () => void; }

export default function StickyFooterPrimaryCTA({ onVoice, onChat }: Props) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-t p-3 safe-area-bottom">
      <div className="max-w-lg mx-auto flex gap-2">
        <Button
          onClick={onChat}
          className="flex-1 h-12 text-sm font-semibold rounded-xl gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-95"
        >
          Voir mon potentiel gratuit
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          onClick={onVoice}
          className="h-12 px-4 rounded-xl border-primary/30"
          aria-label="Parler à Alex"
        >
          <Mic className="w-4 h-4 text-primary" />
        </Button>
      </div>
    </div>
  );
}
