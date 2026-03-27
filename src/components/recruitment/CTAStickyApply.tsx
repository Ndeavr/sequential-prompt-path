import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface Props {
  onApply: () => void;
}

export default function CTAStickyApply({ onApply }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/80 backdrop-blur-lg border-t border-border/60 md:hidden">
      <Button onClick={onApply} size="lg" className="w-full font-semibold">
        <Send className="h-4 w-4 mr-2" />
        Postuler maintenant
      </Button>
    </div>
  );
}
